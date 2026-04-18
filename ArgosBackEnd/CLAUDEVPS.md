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

### Error `returnNaN is not defined`
Causado por un bug de bundling de Next.js 15 con `nuqs` v2.x: el bundler del servidor divide los módulos en chunks y pierde la función interna `returnNaN` que `parseAsInteger` de nuqs usa internamente. Afecta todas las versiones de nuqs v2.x probadas (2.3.0, 2.8.6).

**Intentos fallidos:**
- Downgrade nuqs a 2.3.0 → `package-lock.json` seguía instalando 2.8.6 (lock file no fue actualizado)
- `transpilePackages: ['nuqs']` → no resolvió el problema en el bundle de servidor
- `serverExternalPackages: ['nuqs']` → rompió el build (`/_not-found` falló por no poder serializar `useAdapter`)
- Custom parsers con `createParser` → nuqs aún se incluía en el bundle del servidor como dependencia transitiva de `createLoader`

**Fix final — nuqs eliminado completamente del servidor:**

`nuqs` ahora solo se usa en el cliente (browser), donde el chunk splitting no causa el error.

Cambios aplicados (commits `c0cb9b0`, `3618b69`, `309e0f6`):

1. **`clients/page.tsx`** — Reemplazado `createLoader`/`loadSearchParams` con parsing vanilla (igual que las demás pages):
```ts
const params = await searchParams;
const search = typeof params.search === "string" ? params.search || null : null;
const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) || 10 : 10;
const page = typeof params.page === "string" ? parseInt(params.page, 10) || 1 : 1;
```

2. **`clients/utils/search-params.ts`** — Eliminado (era el único archivo que usaba `createLoader` de `nuqs/server`)

3. **`package.json`** — nuqs fijado en `"2.3.0"` (sin caret)

4. **`package-lock.json`** — Regenerado para resolver nuqs a `2.3.0` (el lock file anterior seguía en 2.8.6)

5. **`src/lib/parsers.server.ts` y `parsers.client.ts`** — Existen como dead code (no importados), creados durante intentos anteriores con `createParser`

**Estado actual del servidor:** ningún archivo de página o componente importa de `nuqs/server`. Los `parsers.server.ts` de cada feature son dead code y webpack no los incluye en el bundle.

**Regla para nuevas features:**
- Servidor (`page.tsx`): usar `parseInt` vanilla para parsear query params, como los demás pages
- Cliente (componentes con `useQueryState`): importar `parseAsInteger` de `@/lib/parsers.client`, nunca directamente de `nuqs`

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
```bash
cd /opt/argos
git pull
# Si cambió package.json o package-lock.json, usar --no-cache obligatoriamente:
docker compose build --no-cache frontend
docker compose up -d frontend
# Si no cambió ninguna dependencia (solo código):
# docker compose up --build -d frontend
```

> **Importante**: Si se cambia `package.json` o `package-lock.json`, siempre usar `--no-cache`. Sin él, Docker reutiliza el layer de `npm install` y la nueva versión de un paquete no se instala.

### Paso 3 — Verificar
```bash
docker logs argos_frontend --tail 20
curl -I http://localhost:3000
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

- **App (directo)**: http://72.249.60.141:3000
- **App (dominio)**: http://ozcabinspeccion.com
- **Backend API**: http://72.249.60.141:3001

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
Los puertos 3000 y 3001 de Docker **no deben estar abiertos** al exterior — solo Nginx los expone internamente.

```bash
ufw status
ufw delete allow 3000    # si aparecen en el status, eliminarlos
ufw delete allow 3001
```

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
