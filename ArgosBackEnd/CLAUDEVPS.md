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

### `/etc/nginx/sites-available/argos`
Proxy inverso Nginx activo apuntando al frontend en `127.0.0.1:3000`.
Está habilitado con symlink:
```bash
/etc/nginx/sites-enabled/argos -> /etc/nginx/sites-available/argos
```

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

### Logs repetidos `Response { status: 200 }` en `argos_frontend` (2026-04-20)

**Síntoma observado en VPS:**
```bash
docker logs argos_frontend --since=10m 2>&1 | tail -30
```
mostraba repetidamente objetos `Response` completos para:
```text
url: 'http://backend:3001/users/details'
status: 200
statusText: 'OK'
```

El backend confirmaba que no era error:
```bash
docker logs argos_backend --since=10m 2>&1 | grep -i "details\|error\|401\|500" | tail -20
```
solo mostraba `POST /users/details` con respuesta exitosa.

**Causa:** un `console.log(expressResp)` en la ruta BFF del frontend:
```text
ArgosFrontEnd/src/app/api/auth/getCurrentUser/route.ts
```

**Fix aplicado:** se eliminó el log del objeto `Response` y se reemplazó por logging compacto solo cuando `/users/details` falla (`status` + `motive/message`). También se eliminó la variable `firebase_uid` sin usar después de verificar la cookie de sesión.

**Verificación local:** `npm run lint` en `ArgosFrontEnd` terminó correctamente. Quedan warnings existentes en otros archivos, pero `getCurrentUser/route.ts` ya no aparece con warning.

**Verificación en VPS tras deploy:**
```bash
docker logs argos_frontend --since=10m 2>&1 | grep "Response {" | tail
```
no devuelve nada.

### `/api/auth/getCurrentUser` devolvía 404 al entrar por IP (2026-04-20)

**Síntoma:** después de iniciar sesión por `http://72.249.60.141`, el navegador llegaba a `/home` pero mostraba:
```text
Error al cargar usuario
Failed to fetch user data
```
y en consola:
```text
Failed to load resource: 404 (Not Found)
/api/auth/getCurrentUser
```

**Diagnóstico:**
```bash
curl -i http://127.0.0.1:3000/api/auth/getCurrentUser
```
respondía correctamente:
```text
HTTP/1.1 401 Unauthorized
{"message":"No session"}
```
pero:
```bash
curl -i http://72.249.60.141/api/auth/getCurrentUser
```
respondía `404` con headers de Express. Eso confirmó que Nginx estaba mandando `/api` al backend Express en vez de dejar que Next.js manejara sus propias rutas API.

**Causa:** el archivo activo `/etc/nginx/sites-available/argos` tenía este bloque incorrecto:
```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
}
```

**Fix aplicado en VPS:** se eliminó por completo el bloque `location /api`. La regla `location /` queda como único proxy y manda todo a Next.js (`127.0.0.1:3000`). Las llamadas del frontend al backend se hacen desde código Next usando `EXPRESS_BASE_URL=http://backend:3001`, no por Nginx público.

**Verificación final:**
```bash
nginx -t
systemctl reload nginx
curl -i http://72.249.60.141/api/auth/getCurrentUser
```
resultado correcto:
```text
HTTP/1.1 401 Unauthorized
{"message":"No session"}
```

Después de esto el sitio cargó correctamente al entrar por:
```text
http://72.249.60.141
```

### Validación de bloqueo del puerto 3000 público (2026-04-20)

Después del deploy y reload de Nginx se validó:
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```
resultado importante:
```text
argos_frontend   127.0.0.1:3000->3000/tcp
```

También se validó que desde la IP pública el puerto 3000 ya no conecta:
```bash
curl -I http://72.249.60.141:3000
```
resultado:
```text
curl: (7) Failed to connect to 72.249.60.141 port 3000
```

Y no hay señales recientes del error anterior:
```bash
docker logs argos_frontend --since=30m 2>&1 | grep -i "returnNaN\|error\|failed\|uncaught" | tail -30
```
sin salida.

### Incidente RCE en `argos_frontend` por Next.js 15.4.4 vulnerable (2026-04-20)

**Síntoma:** después de la limpieza inicial se observaron logs graves en `argos_frontend`:
```text
NEXT_REDIRECT digest: 'xmrig-6.21.0/xmrig'
NEXT_REDIRECT digest: './scanner_linux -t 1000'
Command failed: ps aux | grep xmrig | grep -v grep
```

**Confirmación de compromiso:**
```bash
docker top argos_frontend
```
mostró un proceso malicioso dentro del contenedor:
```text
./scanner_linux -t 1000
```

El host no mostró el proceso fuera del contenedor:
```bash
ps aux | grep -E "scanner_linux|xmrig" | grep -v grep
```
sin salida.

Otros contenedores (`argos_backend`, `argos_mongo`, `argos_mysql`) solo mostraron sus procesos esperados.

**Archivos agregados al contenedor infectado:**
```bash
docker diff argos_frontend | grep -Ei "scanner|xmrig|tmp|tar|wget|curl|sh|bash|node_modules|app"
```
mostró:
```text
A /app/data.log
A /app/monitor.log
A /app/scanner_deployed.log
A /app/scanner_linux
A /app/xmrig-6.21.0
A /app/xmrig-6.21.0/config.json
A /app/xmrig-6.21.0/xmrig
A /app/xmrig.tar.gz
A /app/exploited.log
A /app/failed.log
```

**Contención aplicada en VPS:**
```bash
docker stop argos_frontend
mkdir -p /opt/argos/incident-2026-04-20
docker cp argos_frontend:/app/exploited.log /opt/argos/incident-2026-04-20/exploited.log 2>/dev/null || true
docker cp argos_frontend:/app/scanner_deployed.log /opt/argos/incident-2026-04-20/scanner_deployed.log 2>/dev/null || true
docker cp argos_frontend:/app/monitor.log /opt/argos/incident-2026-04-20/monitor.log 2>/dev/null || true
docker cp argos_frontend:/app/failed.log /opt/argos/incident-2026-04-20/failed.log 2>/dev/null || true
docker rm argos_frontend
```

**Causa probable:** explotación remota de Next.js/React Server Components en Next `15.4.4`. Next publicó un advisory crítico para CVE-2025-66478 / React2Shell, indicando RCE en entornos sin parche y recomendando actualizar de inmediato. Para la rama `15.4.x`, los parches oficiales relevantes son `15.4.8` para RCE y `15.4.10` para fixes posteriores de RSC.

Referencias oficiales:
- https://nextjs.org/blog/CVE-2025-66478
- https://nextjs.org/blog/security-update-2025-12-11

**Fix aplicado en git (commit `6f79e46`):**
```text
Upgrade Next.js for RSC security fix
```

Cambios:
```text
next: 15.4.4 -> 15.4.10
eslint-config-next: 15.4.4 -> 15.4.10
```

Verificación local:
```bash
npm ls next eslint-config-next
```
resultado:
```text
next@15.4.10
eslint-config-next@15.4.10
```

```bash
npm run lint
npm audit --omit=dev
```
`npm run lint` pasó con warnings existentes. `npm audit --omit=dev` reportó `found 0 vulnerabilities`.

**Redeploy seguro requerido en VPS:** no volver a levantar la imagen vieja. Hacer pull del commit y reconstruir sin cache:
```bash
cd /opt/argos
git pull
docker compose build --no-cache frontend
docker compose up -d frontend
```

**Verificación post-redeploy:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker exec argos_frontend node -e "console.log(require('next/package.json').version)"
docker top argos_frontend
docker logs argos_frontend --since=5m 2>&1 | tail -80
curl -I http://72.249.60.141
curl -I http://72.249.60.141:3000
```

Resultado esperado:
```text
Next.js: 15.4.10
argos_frontend: 127.0.0.1:3000->3000/tcp
docker top: solo next-server / node esperado; nunca scanner_linux ni xmrig
http://72.249.60.141: responde 307 /login o 200
http://72.249.60.141:3000: Failed to connect
```

**Acción pendiente importante:** rotar secretos después de estabilizar el redeploy. Next recomienda rotar secretos de aplicaciones que estuvieron online sin parche. Prioridad: Firebase service account JSON, credenciales MySQL, credenciales MongoDB, secretos de cookies/sesión si existen, y cualquier token OAuth/rclone que pueda haber estado disponible para el contenedor.

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

Configuración activa en `/etc/nginx/sites-available/argos`:
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

**Nota crítica**: No redirigir `/api` al backend. El frontend Next.js maneja sus propias rutas `/api` internamente, por ejemplo `/api/auth/getCurrentUser`. Si Nginx manda `/api` a Express, el login llega a `/home` pero falla la carga de usuario con `404`.

Recargar Nginx tras cambios:
```bash
nginx -t && systemctl reload nginx
```

---

## 9. URLs de Acceso

- **App por dominio**: http://ozcabinspeccion.com
- **App por IP**: http://72.249.60.141
- **Backend API**: http://72.249.60.141:3001

> **Importante**: No acceder a `http://72.249.60.141:3000` directamente. El puerto 3000 está enlazado a `127.0.0.1` y no es accesible desde el exterior. Toda la app se accede vía Nginx en puerto 80, ya sea con dominio o con IP sin puerto.

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
- [ ] Rotar secretos tras incidente RCE: Firebase service account, MySQL, MongoDB, secretos de sesión/cookies y tokens auxiliares
- [ ] Cerrar exposición pública innecesaria de backend `3001`, MySQL `3307` y MongoDB `27017` si no se requieren desde internet
