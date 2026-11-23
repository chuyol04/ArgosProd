# Argos — Hoja de ruta UI/UX

Actualizado: 23 de noviembre de 2026.

## Principios

- No alterar cálculos, permisos, contratos, migraciones o destinos de persistencia durante mejoras visuales.
- No presentar rutas incompletas como funciones terminadas.
- El backend es la frontera de seguridad; la visibilidad de botones solo refleja esos permisos.
- Mantener español consistente, navegación por teclado, foco visible y comportamiento responsive.
- Medir antes de introducir optimizaciones o dependencias nuevas.

## Estado

### UI/UX-0 — Auditoría inicial

Estado: completada.

Se inventariaron pantallas y se priorizaron contraste, accesibilidad, navegación, flujo de reportes, permisos visuales, portal del cliente y administración.

### UI/UX-1 — Base compartida

Estado: completada en el commit `bd5c115`.

- Contraste y foco compartidos.
- Banner público de Login sin ampliar acceso privado.
- Documento `es-MX`.
- Contenedores, diálogos, carga, error y movimiento reducido.
- Nombres accesibles en controles principales.

### UI/UX-2 — Inicio y navegación

Estado: completada en el commit `bd5c115`.

- Inicio administrativo organizado por operación, favoritos y grupos.
- Menú móvil con Dialog, Escape, foco contenido y retorno al disparador.
- Selector de cliente responsive.
- Visibilidad de navegación coherente por rol.
- Favoritos con estados de carga, error y recuperación.

### UI/UX-3 — Reportes y detalles

Estado: completada en el commit `bd5c115`.

- Flujo Reporte → Detalle → Revisión → Exportación visible.
- Continuación directa después de crear un reporte.
- Capturas del reporte responsive.
- Contexto del detalle y explicación de guardados.
- Guardar detalle disponible también al final del formulario.
- Corrección de paginación en 320 px.

### UI/UX-4 — Catálogos e instrucciones

Estado: completada.

Pantallas:

- Clientes.
- Servicios.
- Piezas.
- Defectos.
- Instrucciones de trabajo.

Objetivos:

- Unificar encabezados, búsqueda, paginación, estados vacíos y tarjetas móviles.
- Reflejar las restricciones reales del Inspector sin modificar el backend.
- Separar datos del servicio de los usuarios con acceso.
- Organizar el modal de instrucciones en información, modalidad, defectos, colaboradores y documentos.
- Reducir scroll anidado y conservar todos los datos actuales.

Resultado:

- Encabezados, búsqueda, paginación, vacíos y tarjetas móviles comparten el mismo patrón.
- El Inspector ve los catálogos en modo consulta sin acciones de creación, edición o eliminación.
- Servicios separa los datos contractuales de los usuarios Cliente con acceso.
- El modal de instrucciones organiza información, modalidad, defectos, colaboradores y documentos con un solo desplazamiento principal.
- Validación visual realizada en 390 px y 1440 px sin cambios de contratos, rutas o persistencia.

### UI/UX-5 — Portal del cliente

Estado: completada.

- Se diferenciaron cero real, error, acceso restringido y no encontrado sin revelar recursos fuera del alcance del cliente.
- Se mejoró la lectura móvil de tarjetas, horas, gráfica, resumen y detalle de reportes.
- Evidencias y documentos conservan las rutas autorizadas; la información de cada medio se consulta al abrir la vista previa y muestra carga o fallo explícitos.
- Presupuesto medido: la lista mantiene 2 consultas paralelas; el detalle mantiene 1 consulta de reporte y 1 por detalle para incidencias. No se añadió agrupación global porque ampliaría el volumen y el alcance de datos.

### UI/UX-6 — Administración y cierre

Estado: completada.

- Se unificaron encabezados, búsqueda, paginación, estados vacíos y acciones de usuarios y archivos, con tablas de escritorio y tarjetas móviles donde corresponde.
- Roles muestra asignaciones de forma legible y evita trabajo repetido al agrupar los usuarios una sola vez.
- Archivos y evidencias incorpora carga y fallo explícitos de miniaturas, controles táctiles visibles y vista previa adaptable sin alterar sus rutas ni permisos.
- Cambio de contraseña se reorganizó como formulario accesible con validación, estados de envío y explicación del cierre de sesión.
- Se añadieron estados coherentes para acceso denegado, página no encontrada y errores recuperables de rutas protegidas.
- Los modales administrativos mejoraron su adaptación móvil, lectura de contenido largo y copia segura de contraseñas temporales.
- Validación visual completada en 390 px y 1440 px sin desbordamiento horizontal; la validación integrada con roles y persistencia reales permanece separada al final de este documento.

### Alcance funcional separado

`/inspections/create` contiene un formulario incompleto y no forma parte de las fases visuales. Requiere una decisión funcional antes de implementarlo o retirarlo.

## Protocolo compacto para las siguientes fases

Para reducir costo y tiempo sin perder control:

1. Descubrir únicamente los componentes y contratos de la fase.
2. Implementar primero patrones compartidos y después casos particulares.
3. Durante el desarrollo, ejecutar TypeScript y ESLint solo sobre archivos afectados.
4. Revisar visualmente 390 px y 1440 px.
5. Ejecutar todas las pruebas y el build de producción una vez al terminar la fase.
6. Ampliar a 320/768/1024 solo si aparece un problema o en la validación final.
7. No crear harnesses nuevos salvo que una interacción protegida no pueda comprobarse de otra forma.
8. Conservar reportes breves y un commit por fase.

## Validación integrada final

Pendiente con cuentas de prueba y datos no sensibles:

- navegación por Admin, Manager, Inspector y Cliente;
- cambio de cliente y opción Todos;
- creación de reporte y detalle;
- varias cajas y varios defectos por caja;
- recuperación de errores y guardados parciales;
- exportación Excel;
- documentos y evidencias;
- autorización real del backend;
- responsive en 320, 390, 768, 1024 y 1440 px.

Las capturas de componentes no sustituyen pruebas E2E de autenticación, autorización o persistencia.
