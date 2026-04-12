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

4 contenedores orquestados con un único `docker-compose.yml` en `/opt/argos`:

| Contenedor      | Imagen         | Puerto  |
|-----------------|----------------|---------|
| argos_frontend  | Next.js        | 3000    |
| argos_backend   | Express.js     | 3001    |
| argos_mysql     | mysql:8.0      | 3307→3306 |
| argos_mongo     | mongo:7.0      | 27017   |

Todos tienen `restart: unless-stopped`. El servicio systemd `argos.service` los levanta al reiniciar la VPS.

---

## 4. Archivos Clave

### `/opt/argos/ArgosBackEnd/.env`
Contiene todas las variables de entorno sensibles (Firebase, DB, etc.).
**No está en git** — debe configurarse manualmente en la VPS.

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
Causado por `@types/react: ^18` con React 19 instalado + `ignoreBuildErrors: true`.
**Fix**: Actualizado `@types/react` y `@types/react-dom` a `^19.0.0` y removido `ignoreBuildErrors` de `next.config.ts`.

### Build lento por contexto grande
`node_modules` se incluía en el contexto de Docker.
**Fix**: Creado `.dockerignore` en `ArgosFrontEnd/` con `node_modules`, `.next`, `.git`.

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
docker compose up --build -d frontend   # solo frontend
# o ambos:
docker compose up --build -d
```

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

## 10. Pendientes

- [ ] Configurar HTTPS con Let's Encrypt (certbot)
- [ ] Backups automáticos de MySQL y MongoDB
- [ ] Monitoreo de contenedores (uptime, alertas)
