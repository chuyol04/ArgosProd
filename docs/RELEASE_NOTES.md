# Cambios — 2026-09-27

Estado de esta entrega: código y documentación verificados localmente.
El despliegue de VPS, la migración sobre datos reales y la prueba de cámara
en tablet/celular deben ejecutarse por separado. Pasos en [DEPLOYMENT.md](../DEPLOYMENT.md).

## Captura de inspección

- Cada caja requiere **serie o lote**, no necesariamente ambos. Se conserva
  cada identificador como texto; cajas sin serie pueden compartir lote.
- Inspeccionadas, rechazadas y retrabajadas se capturan como enteros no negativos.
  Aceptadas = inspeccionadas − rechazadas, de solo lectura. Retrabajadas no se
  descuentan de esta fórmula. Rechazadas no puede superar inspeccionadas.
- Frontend y backend validan; la creación del detalle y sus cajas es transaccional.
- Requiere `ArgosBackEnd/migrations/allow_lot_only_inspection_boxes.sql` en bases
  existentes. Las instalaciones vacías usan el esquema inicial actualizado.

## Defectos

- Dos opciones de evidencia: **Tomar foto** (captura nativa de cámara trasera
  en móviles compatibles) y **Seleccionar imagen**. Mismo almacenamiento y
  límite existente de 10 MB; disponibilidad de cámara depende del dispositivo.
- Cantidad de solo lectura = rechazadas de la caja elegida, también para cajas
  solo con lote. El backend consulta esa caja y no confía en la cantidad enviada.
- Guardar requiere una caja válida con rechazadas mayores que cero. Quitar solo
  una evidencia no altera cantidades históricas.
- La regla solicitada asigna el total rechazado de la caja a cada defecto;
  no reparte automáticamente ese total entre varias descripciones. Se conserva
  el aviso existente cuando la suma de defectos no coincide con rechazadas.

## Portal del cliente y Excel

- Pantalla: resumen por **fecha + turno**, acumulando inspeccionadas, aceptadas,
  rechazadas, retrabajadas, horas y defectos. Los nombres de defectos equivalentes
  se consolidan ignorando mayúsculas y espacios redundantes.
- Se conserva el gráfico global. Horas RATE = inspeccionadas / rate; FULL TIME
  mantiene la suma de horas registradas, sin multiplicarla por cajas.
- Excel: conserva el desglose por caja/serie/lote, cantidades y defectos.
  No se modifica el exportador ni el alcance de permisos del Cliente.

## Despliegue y documentación

- Guía separa actualización de Neubox e instalación limpia en Hostinger con
  otro dominio. Respaldar antes de migrar; después reconstruir backend y frontend.
- Incluye ajustes previos pendientes: puertos internos a localhost y bootstrap
  de roles/administrador sin contraseña fija ni impresión de contraseña.
- El dominio/IP nuevos y secretos se configuran fuera de Git. Las credenciales
  de base de ejemplo todavía presentes en Compose deben sustituirse de forma
  coordinada antes de un despliegue nuevo de producción; cambiarlas en el archivo
  no cambia usuarios de volúmenes ya inicializados.

## Verificación local

Desde la raíz con Node 22.17 o compatible:

```bash
node --test ArgosBackEnd/tests/*.test.js
node --experimental-strip-types --test ArgosFrontEnd/tests/*.test.mjs
cd ArgosFrontEnd
npm run build
```

Resultado: **20 pruebas backend + 4 frontend aprobadas** y compilación de
producción exitosa. El build local avisa que falta `EXPRESS_BASE_URL` al intentar
precargar clientes; Docker define `http://backend:3001`. Las pruebas de handlers
simulan la base: no sustituyen verificar la migración en MySQL ni probar la VPS.
