1. Resumen del Proyecto
Este documento describe el proceso completo de despliegue del sistema Argos (sistema de reporte de inspección) en una VPS de Neubox con Ubuntu 24, usando Docker y Docker Compose.

Repositorios utilizados:
•	Frontend: https://github.com/chuyol04/ArgosFrontEnd (Next.js + TypeScript + Tailwind)
•	Backend: https://github.com/chuyol04/ArgosBackEnd (Express.js + MySQL + MongoDB)

2. Infraestructura
2.1 Especificaciones del Servidor
Componente	Valor
Proveedor	Neubox
OS	Ubuntu 24 LTS
CPU	3 Cores
RAM	4 GB
IP	72.249.60.141
Dominio	ozcabinspeccion.com
Git	2.43.0
Docker	29.3.0

3. Arquitectura de Contenedores
El sistema está compuesto por 4 contenedores Docker:
•	argos_frontend — Next.js en puerto 3000
•	argos_backend — Express.js en puerto 3001
•	argos_mysql — MySQL 8.0 en puerto 3306
•	argos_mongo — MongoDB 7.0 en puerto 27017

El backend (mysql + mongo + express) se orquesta con Docker Compose. El frontend corre de forma independiente con docker run.

4. Pasos Realizados

Paso	Estado	Notas
Actualizar sistema (apt update && upgrade)	✅ Completado	
Instalar Git 2.43.0	✅ Completado	
Instalar Docker 29.3.0	✅ Completado	via get.docker.com
Crear carpeta /opt/argos	✅ Completado	
Clonar repo backend (2.50 MiB)	✅ Completado	rama main
Clonar repo frontend (3.25 MiB)	✅ Completado	rama master
Crear Dockerfile backend	✅ Completado	node:20-alpine
Crear Dockerfile frontend	✅ Completado	multi-stage build
Crear docker-compose.yml	✅ Completado	con healthchecks
Levantar backend (docker compose up)	✅ Completado	MySQL + Mongo + Express
Instalar y configurar UFW	✅ Completado	puertos 22, 3000, 3001
Build frontend (docker build)	✅ Completado	con .env Firebase
Run frontend (docker run)	✅ Completado	puerto 3000
Instalar Nginx	✅ Completado	proxy inverso
Configurar dominio con Nginx	⏳ Pendiente	ozcabinspeccion.com
Configurar HTTPS (SSL)	⏳ Pendiente	Let's Encrypt
Configurar .env seguro	⏳ Pendiente	mejoras futuras

 
5. Archivos de Configuración
5.1 Dockerfile — Backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]

5.2 Dockerfile — Frontend (Multi-stage)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]

5.3 docker-compose.yml
Incluye servicios: mysql, mongo, backend. Configurado con:
•	restart: always — reinicio automático si falla
•	healthcheck — espera que MySQL y Mongo estén listos antes de arrancar el backend
•	volumes persistentes — mysql_data y mongo_data
•	SERVICE_IP: 0.0.0.0 — para escuchar en todas las interfaces

 
6. Comandos de Referencia
6.1 Levantar Backend
cd /opt/argos/backend
docker compose up --build -d

6.2 Levantar Frontend
cd /opt/argos/frontend
docker build -t argos_frontend .
docker run -d --name argos_frontend --restart always -p 3000:3000 argos_frontend

6.3 Ver estado de contenedores
docker ps

6.4 Ver logs
docker logs argos_backend
docker logs argos_mysql
docker logs argos_frontend

6.5 Reiniciar servicios
docker compose down && docker compose up -d   # backend
docker restart argos_frontend                 # frontend

7. Mejoras Pendientes
•	Configurar Nginx como proxy inverso para acceso por dominio sin puerto
•	Agregar SSL/HTTPS con Let's Encrypt (certbot)
•	Mover credenciales a archivo .env seguro (no commitear en GitHub)
•	Revocar y regenerar clave privada de Firebase expuesta
•	Agregar .gitignore correcto para .env en ambos repos
•	Agregar monitoreo de contenedores (uptime, alertas)
•	Configurar backups automáticos de MySQL y MongoDB
•	Cambiar contraseña root de la VPS

8. URLs de Acceso Actual
•	Frontend: http://72.249.60.141:3000
•	Backend API: http://72.249.60.141:3001
•	(Próximamente): http://ozcabinspeccion.com
