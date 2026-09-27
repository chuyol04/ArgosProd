# Argos — Guía de despliegue y operación

Documento vigente para los dos despliegues previstos:

Última actualización: **27 de septiembre de 2026**. Cambios y pruebas de esta
entrega: [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md). Publicar en Git no
ejecuta el despliegue ni las migraciones en ninguna VPS.

- Neubox: `ozcabinspeccion.com`, instalación existente en `/opt/argos`.
- Hostinger: instalación nueva, base de datos vacía y dominio pendiente.

El repositorio es la fuente de verdad del código:
`https://github.com/chuyol04/ArgosProd`.

## 1. Arquitectura

El `docker-compose.yml` raíz ejecuta:

| Servicio | Contenedor | Acceso desde el host |
|---|---|---|
| Next.js | `argos_frontend` | `127.0.0.1:3000` |
| Express | `argos_backend` | `127.0.0.1:3001` |
| MySQL 8 | `argos_mysql` | `127.0.0.1:3307` |
| MongoDB 7 / GridFS | `argos_mongo` | `127.0.0.1:27017` |
| Respaldos | `argos_backup` | Sin puerto público |

Solo Nginx debe recibir tráfico público en 80/443. Los puertos 3000, 3001,
3307 y 27017 nunca deben publicarse en `0.0.0.0`.

## 2. Archivos que no están en Git

| Archivo | Contenido |
|---|---|
| `/opt/argos/.env` | Variables públicas de Firebase usadas durante el build y `COOKIE_SECURE` |
| `/opt/argos/ArgosBackEnd/.env` | Firebase Admin y secretos del backend |
| `/opt/argos/argos-backup/rclone.conf` | Credenciales OAuth para respaldos en Google Drive |
| `/etc/nginx/sites-available/argos` | Proxy inverso y dominio de esa VPS |

Nunca colocar contraseñas, service accounts ni `rclone.conf` en Git.

### `.env` de la raíz

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-web-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<proyecto>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
COOKIE_SECURE=true
```

### `ArgosBackEnd/.env`

```dotenv
FIREBASE_API_KEY=<firebase-web-api-key>
FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

`FIREBASE_SERVICE_ACCOUNT_JSON` debe estar en una sola línea. Las variables de
MySQL, Mongo, puertos y URLs internas ya se establecen en `docker-compose.yml`.

## 3. Perfiles de infraestructura

### Neubox actual

- Ruta: `/opt/argos`
- Dominio: `ozcabinspeccion.com`
- IP histórica: `72.249.60.141`
- Actualización sobre bases existentes: aplicar únicamente migraciones nuevas.

### Hostinger nuevo

- Recomendado: KVM 2, Ubuntu 24.04 con Docker, 2 vCPU, 8 GB RAM y 100 GB NVMe.
- Ruta: `/opt/argos`
- Dominio: `<HOSTINGER_DOMAIN>`
- IP: `<HOSTINGER_IP>`
- Inicio limpio: no importar MySQL, MongoDB, volúmenes ni evidencias de Neubox.
- `new_mysql_schema.sql` crea el esquema automáticamente cuando el volumen de
  MySQL se inicia vacío.

El despliegue de Hostinger puede convivir con Neubox porque utilizará otro
dominio y bases independientes.

## 4. Despliegue limpio en Hostinger

### 4.1 Preparar la VPS

Elegir la plantilla Ubuntu 24.04 con Docker. Después, por SSH:

```bash
apt-get update
apt-get upgrade -y
apt-get install -y git nginx certbot python3-certbot-nginx fail2ban ufw
systemctl enable --now docker nginx fail2ban

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Configurar una llave SSH antes de deshabilitar autenticación por contraseña.

### 4.2 Clonar el proyecto

```bash
git clone https://github.com/chuyol04/ArgosProd.git /opt/argos
cd /opt/argos
git branch --show-current
git log -1 --oneline
```

Debe quedar en `main`. Crear manualmente los dos archivos `.env` descritos en
la sección 2.

### 4.3 Firebase

Hay dos alternativas:

- Mismo proyecto Firebase: agregar `<HOSTINGER_DOMAIN>` a Authentication →
  Settings → Authorized domains.
- Instalación totalmente independiente: crear otro proyecto Firebase, una Web
  App y una service account; usar esos valores en ambos `.env`.

No copiar usuarios desde MySQL. En un inicio limpio solamente se crea el
administrador inicial.

### 4.4 Levantar la aplicación sin el servicio de backup

```bash
cd /opt/argos
docker compose config --quiet
docker compose up -d --build mysql mongo backend frontend
docker compose ps
```

No ejecutar manualmente `new_mysql_schema.sql`: Docker lo procesa solamente al
crear por primera vez el volumen vacío de MySQL.

### 4.5 Crear roles y administrador inicial

El script crea los roles `Admin`, `Manager`, `Inspector` y `Cliente`; después
crea o enlaza el administrador en Firebase y MySQL. No guarda la contraseña en
el repositorio.

```bash
cd /opt/argos
read -rp 'Correo del administrador: ' ADMIN_EMAIL
read -srp 'Contraseña (mínimo 12 caracteres): ' ADMIN_PASSWORD
echo
read -rp 'Nombre [Administrador]: ' ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Administrador}

docker compose exec \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  backend node scripts/create-admin.js --check

docker compose exec \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  backend node scripts/create-admin.js

unset ADMIN_EMAIL ADMIN_PASSWORD ADMIN_NAME
```

### 4.6 Nginx para el nuevo dominio

Crear `/etc/nginx/sites-available/argos` reemplazando los marcadores:

```nginx
server {
    listen 80 default_server;
    server_name _;
    return 444;
}

server {
    listen 80;
    server_name <HOSTINGER_DOMAIN> www.<HOSTINGER_DOMAIN>;

    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

No crear un bloque `location /api`: Next.js maneja sus rutas `/api` y se
comunica internamente con Express mediante `http://backend:3001`.

```bash
ln -s /etc/nginx/sites-available/argos /etc/nginx/sites-enabled/argos
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 4.7 DNS y HTTPS

En el registrador del dominio nuevo:

- `A` para `@` → `<HOSTINGER_IP>`
- `CNAME` para `www` → `<HOSTINGER_DOMAIN>`

No tocar MX, SPF, DKIM o DMARC si el correo se aloja con otro proveedor.
Cuando el DNS ya resuelva:

```bash
getent ahostsv4 <HOSTINGER_DOMAIN>
certbot --nginx -d <HOSTINGER_DOMAIN> -d www.<HOSTINGER_DOMAIN>
nginx -t && systemctl reload nginx
curl -I https://<HOSTINGER_DOMAIN>
```

## 5. Actualizar una instalación existente

### 5.1 Revisión previa

```bash
cd /opt/argos
git status --short
git rev-parse --short HEAD
docker compose ps
```

No continuar si existen modificaciones locales en archivos controlados por
Git. Los archivos `.env`, `rclone.conf` y respaldos no deben estar rastreados.

### 5.2 Respaldo previo a cambios de base

```bash
mkdir -p /opt/argos-db-backups
umask 077
BACKUP="/opt/argos-db-backups/argos_$(date +%Y%m%d_%H%M%S).sql"
docker exec argos_mysql sh -c \
  'mysqldump --single-transaction --no-tablespaces -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "$BACKUP" && test -s "$BACKUP" &&
ls -lh "$BACKUP"
```

Si el respaldo falla o está vacío, detener la actualización y revisar el error.

### 5.3 Descargar código (sin levantar todavía la nueva versión)

```bash
cd /opt/argos
git pull --ff-only origin main
docker compose config --quiet
```

Continuar con las migraciones antes de reconstruir y levantar los servicios.

### 5.4 Migraciones

- Base existente: ejecutar cada archivo nuevo de `ArgosBackEnd/migrations/`
  una sola vez y conservar un respaldo previo.
- Base nueva: no ejecutar migraciones históricas; el esquema inicial ya contiene
  todos los cambios.
- Nunca ejecutar `new_mysql_schema.sql` contra una base existente.

Migración requerida al pasar de `b04f6ee` a `85d44b2`:

No repetirla si las columnas por caja y el vínculo del defecto ya existen.

```bash
docker exec -i argos_mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < ArgosBackEnd/migrations/add_counts_per_serial_and_incident_link.sql
```

**Entrega 2026-09-27 — permitir cajas solo con lote:** requiere la tabla y las
columnas de cantidades por caja de la migración anterior. Con respaldo válido,
ejecutar antes de desplegar el backend y frontend nuevos:

```bash
cd /opt/argos
docker exec -i argos_mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < ArgosBackEnd/migrations/allow_lot_only_inspection_boxes.sql
docker exec argos_mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW COLUMNS FROM inspection_detail_serial_numbers;"'
```

Verificar `Null = YES`. Esta migración conserva los datos y puede repetirse;
no convierte series antiguas vacías ni modifica cantidades históricas. Las
cajas nuevas sin serie se guardan con `NULL` en MySQL, permitiendo repetir un
lote entre cajas. No se necesita migración para la cámara ni el resumen por turno.

### 5.5 Reconstruir y levantar

```bash
cd /opt/argos
docker compose build backend frontend &&
docker compose up -d mysql mongo backend frontend &&
docker compose ps
```

Actualizar **ambos** servicios: la validación y cantidad automática se aplican
tanto en pantalla como en el backend. Un reinicio solo no reconstruye imágenes.
Usar `docker compose build --no-cache backend frontend` únicamente si existe
evidencia de una imagen obsoleta. No borrar volúmenes ni importar el esquema inicial.

Esta entrega incluye los ajustes pendientes de Hostinger: puertos internos
enlazados a localhost y administrador inicial mediante variables de entorno.
No ejecutar el bootstrap de administrador al actualizar una instalación existente.

## 6. Verificación posterior

```bash
cd /opt/argos
docker compose ps
docker compose logs --tail=100 backend frontend
curl -I http://127.0.0.1:3000
curl -I https://<DOMINIO_DE_ESTA_VPS>
docker exec argos_frontend node -e "console.log(require('next/package.json').version)"
```

Verificar manualmente:

1. Inicio y cierre de sesión.
2. Creación de cliente, servicio, pieza e instrucción de trabajo.
3. Crear detalle con solo lote `7015256760`, 840 inspeccionadas y 2 rechazadas:
   mostrar 838 aceptadas, de solo lectura; también permitir solo serie.
   Bloquear ambos identificadores vacíos, negativos y rechazadas > inspeccionadas.
4. Agregar defecto: elegir cajas con 9 y 5 rechazadas y comprobar que Cantidad
   cambie a 9 y 5, sin edición manual; probar Tomar foto y Seleccionar imagen
   en un dispositivo real. Conservar el límite de 10 MB por archivo.
5. Excel: conservar cada caja/serie/lote y sus cantidades, sin duplicar horas
   ni piezas al expandir defectos; verificar RATE y FULL TIME.
6. Portal del cliente: una tarjeta por fecha y turno con las cuatro cantidades,
   horas y defectos sumados por descripción; sin tarjetas individuales por caja.
   Confirmar el aislamiento entre clientes y entre días/turnos.

Confirmar que los servicios internos no sean públicos:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Los bindings de 3000, 3001, 3307 y 27017 deben comenzar con `127.0.0.1:`.

## 7. Respaldos nuevos

Aunque Hostinger comience sin datos anteriores, habilitar respaldos después de
validar el despliegue. Copiar `rclone.conf` y ejecutar:

```bash
cd /opt/argos
chmod 600 argos-backup/rclone.conf
docker compose up -d --build backup
docker exec argos_backup /backup.sh
docker exec argos_backup tail -100 /var/log/backup.log
```

El contenedor guarda MySQL y MongoDB/GridFS en Google Drive. Los snapshots del
proveedor complementan este respaldo, pero no lo sustituyen.

## 8. Operación y diagnóstico

```bash
docker compose ps
docker compose logs --since=10m backend frontend
docker stats --no-stream
df -h
free -h
fail2ban-client status sshd
certbot renew --dry-run
```

Reiniciar únicamente un servicio:

```bash
docker compose restart frontend
```

Evitar `docker compose down` durante una actualización normal. Nunca ejecutar
`docker system prune --volumes` en producción.

## 9. Reversión de código

La reversión de código no revierte cambios de base de datos.

```bash
cd /opt/argos
git log --oneline -10
git switch --detach <COMMIT_ESTABLE>
docker compose up -d --build backend frontend
```

Para volver a `main` después de resolver el incidente:

```bash
git switch main
git pull --ff-only origin main
docker compose up -d --build backend frontend
```

Si una migración produjo daño o incompatibilidad, restaurar el respaldo MySQL
correspondiente antes de levantar la versión anterior.

## 10. Reglas críticas

- Nginx siempre apunta a `127.0.0.1:3000`.
- Nginx no redirige `/api` directamente a Express.
- `COOKIE_SECURE=true` cuando se usa HTTPS.
- Las variables `NEXT_PUBLIC_FIREBASE_*` deben existir antes del build.
- Los dominios deben estar autorizados en Firebase Authentication.
- No exponer puertos de Docker públicamente.
- No guardar secretos en Git ni pegarlos en tickets o chats.
- Probar las migraciones y realizar respaldo antes de aplicarlas a una base con datos.
- Mantener Next.js y dependencias de seguridad actualizadas.

El resumen de incidentes anteriores y sus lecciones está en
[`docs/OPERATIONS_HISTORY.md`](docs/OPERATIONS_HISTORY.md).
