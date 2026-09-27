# Argos — Historial operativo resumido

Este documento conserva las causas y medidas preventivas de incidentes
anteriores. Las instrucciones vigentes están en [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

## Exposición de puertos Docker

El frontend estuvo publicado en `0.0.0.0:3000` y recibió tráfico automatizado
que evitaba Nginx. UFW por sí solo no protege los puertos publicados por Docker.

Medida permanente: todos los puertos de aplicación y bases se enlazan a
`127.0.0.1`; solamente Nginx publica 80/443.

## Rutas `/api` enviadas al servicio incorrecto

Un bloque Nginx `location /api` enviaba las rutas BFF de Next.js a Express y
provocaba errores de autenticación. Nginx debe enviar todo `location /` al
frontend; Next.js usa `EXPRESS_BASE_URL=http://backend:3001` dentro de Docker.

## Variables Firebase ausentes durante el build

Las variables `NEXT_PUBLIC_FIREBASE_*` se incrustan al compilar Next.js. Si no
existen antes de `docker compose build frontend`, el login puede quedar en
blanco aunque las variables aparezcan después en runtime.

## Contenedor frontend comprometido

En abril de 2026 se detectaron procesos y archivos no autorizados dentro del
contenedor frontend. Se eliminó el contenedor, se actualizó Next.js a una
versión corregida, se reconstruyó sin caché y se confirmó que el puerto 3000 no
fuera público.

Lecciones permanentes:

- Actualizar dependencias con avisos críticos de seguridad.
- Destruir y reconstruir una imagen comprometida; no intentar limpiarla.
- Verificar procesos con `docker top` y cambios con `docker diff`.
- Rotar secretos si pudieron estar expuestos.

## CSF instalado por el proveedor

Una renovación de Neubox activó CSF con reglas que bloquearon HTTP, tráfico al
bridge Docker y resolución DNS desde contenedores. Si una aplicación deja de
responder después de un cambio del proveedor, revisar CSF/nftables además de
UFW y Docker.

## Límite de carga de archivos

Nginx rechazó evidencias mayores al límite predeterminado. La configuración
vigente usa `client_max_body_size 12M`, coherente con el límite de 10 MB de la
aplicación.

## Comprobaciones rápidas

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker top argos_frontend
docker compose logs --since=10m backend frontend
nginx -t
curl -I http://127.0.0.1:3000
```
