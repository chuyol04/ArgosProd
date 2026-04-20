# Argos — Documentación de Despliegue VPS

## 1. Resumen del Proyecto

Sistema de gestión de inspecciones (Argos) desplegado en VPS Neubox.
Monorepo unificado con frontend (Next.js) + backend (Express) + bases de datos.

- **Repositorio**: https://github.com/chuyol04/ArgosProd
- **Frontend**: Next.js 15 + TypeScript + Tailwind
- **Backend**: Express.js + MySQL 8 + MongoDB 7

---

## 2. Infraestructura

| Componente | Valor              |
|------------|--------------------|
| Proveedor  | Neubox             |
| OS         | Ubuntu 24 LTS      |
| CPU        | 3 Cores            |
| RAM        | 4 GB               |
| IP         | 72.249.60.141      |
| Dominio    | ozcabinspeccion.com |
| Docker     | 29.3.0             |

---

## 3. Arquitectura de Contenedores

5 contenedores orquestados con un único `docker-compose.yml` en `/opt/argos`:

| Contenedor      | Imagen         | Puerto      |
|-----------------|----------------|-------------|
| argos_frontend  | Next.js        | 3000        |
| argos_backend   | Express.js     | 3001        |
| argos_mysql     | mysql:8.0      | 3307→3306   |
| argos_mongo     | mongo:7.0      | 27017       |
| argos_backup    | debian:bookworm| (sin puerto)|

Todos tienen `restart: unless-stopped`. El servicio systemd `argos.service` los levanta al reiniciar la VPS.

---

## 4. Archivos Clave

### `/opt/argos/ArgosBackEnd/.env`
Contiene todas las variables de entorno sensibles (Firebase, DB, etc.).
**No está en git** — debe configurarse manualmente en la VPS.

### `/opt/argos/argos-backup/rclone.conf`
Credenciales OAuth de rclone para Google Drive.
**No está en git** — se copia manualmente desde la PC local con:
```powershell
scp C:\Users\chuy_\AppData\Roaming\rclone\rclone.conf root@72.249.60.141:/opt/argos/argos-backup/rclone.conf
```

### `/etc/systemd/system/argos.service`
Servicio systemd que levanta Docker Compose automáticamente al arrancar la VPS.

### `/etc/nginx/sites-available/default`
Proxy inverso Nginx apuntando al frontend en puerto 3000.

---

## 5. Fixes Importantes Realizados

### Cookie `Secure` en HTTP
El login usa un Server Action (`login.action.ts`) que tenía:
```typescript
secure: process.env.NODE_ENV === "production"  // siempre true en Docker
```
**Fix**: Cambiado a `secure: process.env.COOKIE_SECURE !== "false"`.
El `docker-compose.yml` tiene `COOKIE_SECURE: "false"` en el frontend.

### Error `returnNaN is not defined` — causa real: ataque de bots

**Causa raíz:** bots atacando el puerto 3000 directamente (sin pasar por Nginx). Docker expone el puerto 3000 a la IP pública del servidor ignorando las reglas de UFW — UFW **no protege puertos de Docker**. Los bots generaban cientos de requests por minuto que saturaban el backlog de conexiones del socket, dejando el servidor inaccesible. El error `returnNaN is not defined` es un error interno de Next.js que se dispara bajo esas condiciones de carga.

**Lo que NO era la causa:** no era un bug de bundling de nuqs. Se investigaron múltiples hipótesis (chunk splitting, transpilePackages, serverExternalPackages) y se hicieron varios intentos fallidos antes de identificar el problema real.

**Acciones tomadas (commit `ab2aaae`):**
- `nuqs` eliminado completamente del proyecto y reemplazado con hooks nativos de Next.js (`useSearchParams`, `useRouter`, `usePathname`) en `src/lib/useUrlState.ts`
- Todos los `parsers.client.ts` y `parsers.server.ts` de cada feature eliminados
- Esto fue una mejora secundaria correcta, pero no resolvió los errores por sí sola

**Fix de seguridad real (commit `fix: bind frontend port to 127.0.0.1`):**
En `docker-compose.yml`, el puerto del frontend cambió de:
```yaml
ports:
  - "3000:3000"      # docker-proxy escucha en 0.0.0.0:3000 — expuesto al exterior
```
a:
```yaml
ports:
  - "127.0.0.1:3000:3000"  # docker-proxy escucha solo en localhost — bots bloqueados
```

Con este cambio, los bots no pueden conectarse directamente a puerto 3000 desde internet. Nginx (que corre en el host) sigue pudiendo conectarse a `127.0.0.1:3000` sin problema.

**Regla crítica — Docker y UFW:**
- UFW **no bloquea puertos de Docker**. Docker inyecta reglas en iptables directamente, bypaseando UFW.
- Para proteger un puerto de Docker, **no usar UFW** — cambiar el binding en `docker-compose.yml` a `127.0.0.1:PUERTO:PUERTO`.
- Nunca exponer directamente los puertos 3000 o 3001 a la IP pública.

**Regla para nuevas features (URL state en cliente):**
```typescript
import { useUrlString, useUrlInt } from "@/lib/useUrlState";
const [qSearch, setQSearch] = useUrlString("search");
const [qLimit, setQLimit] = useUrlInt("limit", 10);
const [qPage, setQPage] = useUrlInt("page", 1);
```

### Build lento por contexto grande
`node_modules` se incluía en el contexto de Docker.
**Fix**: Creado `.dockerignore` en `ArgosFrontEnd/` con `node_modules`, `.next`, `.git`.

### Pantalla blanca en login (VPS)
Las variables `NEXT_PUBLIC_FIREBASE_*` son necesarias en **tiempo de build** (`npm run build`), no en runtime. Next.js las incrusta dentro del bundle JS. Si el build se hace sin ellas quedan `undefined` y la app crashea en el cliente mostrando pantalla blanca.
**Fix**: Agregados `ARG`/`ENV` en `ArgosFrontEnd/Dockerfile` y `build.args` en `docker-compose.yml`. Los valores deben estar en `/opt/argos/.env` antes de hacer el build:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDvVj7N94j5971XaIfEH6JlsSh_X_ozl6Q
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inspeccion-cfdf1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inspeccion-cfdf1
```

---

## 6. Comandos de Referencia

### Ver estado de contenedores
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Ver logs
```bash
docker logs argos_frontend --tail 50
docker logs argos_backend --tail 50
docker logs argos_mysql --tail 50
docker logs argos_backup --tail 50
```

### Ver log de backups
```bash
docker exec argos_backup cat /var/log/backup.log
```

### Reiniciar un contenedor
```bash
docker restart argos_frontend
```

### Reiniciar todo el stack
```bash
cd /opt/argos
docker compose down
docker compose up -d
```

### Ver estado del servicio systemd
```bash
systemctl status argos
```

---

## 7. Flujo para Subir Cambios

### Paso 1 — Local: push a GitHub
```bash
cd /c/Argos
git add .
git commit -m "descripción del cambio"
git push
```

### Paso 2 — VPS: pull y rebuild

**Caso A — Solo cambios de código (sin tocar dependencias):**
```bash
cd /opt/argos
git pull
docker compose up --build -d frontend
```

**Caso B — Cambió `package.json` o `package-lock.json`:**
```bash
cd /opt/argos
git pull
docker compose build --no-cache frontend
docker compose up -d frontend
```

> **Importante**: Si se cambia `package.json` o `package-lock.json`, siempre usar `--no-cache`. Sin él, Docker reutiliza el layer de `npm install` y la nueva versión de un paquete no se instala.

> **Nunca hacer `docker system prune -af` en producción** — borra todas las imágenes y volúmenes del sistema. Solo hacerlo como último recurso en casos extremos de cache corrupta.

### Paso 3 — Verificar
```bash
docker compose logs frontend --tail 20 --timestamps
docker compose logs frontend --since=10m | grep -i "error\|⨯\|warn"
```

---

## 8. Nginx

Configuración en `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name ozcabinspeccion.com www.ozcabinspeccion.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Nota**: No redirigir `/api` al backend — el frontend Next.js maneja sus propias rutas `/api` internamente.

Recargar Nginx tras cambios:
```bash
nginx -t && systemctl reload nginx
```

---

## 9. URLs de Acceso

- **App**: http://ozcabinspeccion.com (usar siempre el dominio, nunca IP:puerto directo)
- **Backend API**: http://72.249.60.141:3001

> **Importante**: No acceder a `http://72.249.60.141:3000` directamente. El puerto 3000 está enlazado a `127.0.0.1` y no es accesible desde el exterior. Toda la app se accede vía Nginx en puerto 80.

---

## 10. Sistema de Backups

Contenedor `argos_backup` corre cron jobs cada 12 horas (00:00 y 12:00).

**Archivos generados:**
- `mysql_YYYYMMDD_HHMMSS.sql.gz` — dump completo de `argos_db`
- `mongo_YYYYMMDD_HHMMSS.gz` — dump completo de MongoDB

**Destino:** Google Drive, carpeta `ArgosBackups`
**Retención:** 7 días (local y en Drive)
**Cuenta Drive configurada:** cuenta Gmail del administrador

**Probar backup manualmente:**
```bash
docker exec argos_backup /backup.sh
```

**Ver último log:**
```bash
docker exec argos_backup cat /var/log/backup.log
```

**Configuración rclone:**
- Herramienta: `rclone` v1.73.4
- Remote name: `gdrive`
- Config: `/opt/argos/argos-backup/rclone.conf` (NO en git)
- Para regenerar config: instalar rclone en PC local, correr `rclone config`, copiar con `scp`

---

## 11. Seguridad

### fail2ban (instalado 2026-04-17)
Protege contra brute force SSH. Se instala con:
```bash
apt-get -o Acquire::ForceIPv4=true install -y fail2ban --fix-missing
systemctl enable fail2ban && systemctl start fail2ban
```
> La VPS no tiene IPv6 — siempre usar `-o Acquire::ForceIPv4=true` con apt.

Ver IPs baneadas:
```bash
fail2ban-client status sshd
```

### UFW Firewall (configurado 2026-04-17)
Puertos abiertos: 22 (SSH), 80 (HTTP), 443 (HTTPS).

> **Advertencia crítica:** UFW **no protege puertos de Docker**. Docker modifica iptables directamente y bypasea UFW. Agregar `ufw deny 3000` no tiene efecto sobre Docker.

La protección correcta es el binding en `docker-compose.yml`:
```yaml
ports:
  - "127.0.0.1:3000:3000"   # solo localhost puede conectarse
```

No usar `ufw allow 3000` ni `ufw deny 3000` para puertos de Docker — no funciona.

### Intento de command injection detectado
Se detectó en logs: `echo <base64> | base64 -d | bash` apuntando a `78.153.140.16/re.sh`.
El comando falló (error registrado). El código frontend no tiene `exec/spawn/child_process`.

### Actualizaciones de seguridad pendientes
```bash
apt-get -o Acquire::ForceIPv4=true update
apt-get -o Acquire::ForceIPv4=true upgrade -y
```

---

## 12. Pendientes

- [ ] Configurar HTTPS con Let's Encrypt (certbot)
- [ ] Monitoreo de contenedores (uptime, alertas)
