# Argos — Reglas de negocio

Actualizado: 23 de noviembre de 2026.

Este documento resume las reglas vigentes del sistema de inspección. El código y el esquema SQL siguen siendo la fuente ejecutable; si una descripción histórica entra en conflicto, prevalecen las validaciones actuales del backend, `ArgosBackEnd/new_mysql_schema.sql` y sus migraciones.

## 1. Flujo operativo

El orden de configuración y captura es:

```text
Cliente
  → Servicio
    → Pieza y defectos esperados
      → Instrucción de trabajo
        → Reporte de inspección
          → Detalle de inspección
            → Cajas
              → Defectos y evidencias
                → Revisión y exportación
```

- Los catálogos preparan la operación; no son pasos que el inspector deba volver a crear durante cada captura.
- El administrador o manager configura clientes, servicios, piezas, defectos e instrucciones de trabajo.
- El inspector crea o actualiza reportes, detalles e incidentes dentro de lo que tenga asignado.
- La ruta `/inspections/create` está incompleta y no se considera parte del flujo productivo. El flujo vigente comienza en `/reportes-inspeccion`.

## 2. Roles y alcance

Los roles existentes son `Admin`, `Manager`, `Inspector` y `Cliente`. No existen tablas de permisos; la autorización usa nombres de rol en frontend y backend.

### Admin y Manager

- Pueden operar reportes y detalles.
- Pueden administrar catálogos según las rutas existentes.
- Las funciones exclusivamente administrativas de usuarios, roles y archivos se muestran conforme a la navegación actual; cualquier cambio debe conservar las comprobaciones del backend.

### Inspector

- Puede consultar catálogos e instrucciones necesarias para trabajar.
- Puede crear y actualizar reportes, detalles e incidentes.
- No puede eliminar información en rutas protegidas.
- No puede modificar clientes, roles, piezas, defectos, instrucciones de trabajo, asignaciones, servicios o archivos administrativos.
- Ocultar una acción en la interfaz es UX; el backend continúa siendo la frontera de seguridad.

### Cliente

- Tiene un portal de solo lectura en `/mis-reportes` y puede cambiar su propia contraseña.
- `users.client_id` fija su cliente; no puede ampliar ese alcance mediante parámetros o el selector global.
- `service_client_users` limita los servicios concretos cuyos reportes puede consultar.
- Las consultas de reportes, detalles e incidentes se filtran en el backend y responden como no encontradas cuando el recurso pertenece a otro cliente.
- No puede acceder a los catálogos ni ejecutar escrituras operativas.

### Selector global de cliente

- Solo aplica al personal interno.
- La selección se conserva en la cookie `active_client_id` y se envía al backend como `client_id`.
- La opción Todos equivale a no aplicar un cliente específico.
- Para un usuario Cliente, el backend ignora ese parámetro y utiliza su propio `client_id` y asignaciones de servicio.

## 3. Clientes, servicios e instrucciones de trabajo

- Un servicio pertenece a un solo cliente y tiene fechas de inicio y fin.
- Varios usuarios Cliente pueden consultar el mismo servicio mediante `service_client_users`.
- Una instrucción de trabajo pertenece a un servicio y a una pieza.
- La pieza puede capturarse por nombre; el backend reutiliza una coincidencia existente o crea la pieza, manteniendo `work_instructions.part_id` como llave foránea obligatoria.
- Una instrucción define el problema o condición que debe revisarse. Esto no es lo mismo que el defecto realmente encontrado.
- Los defectos disponibles para captura se asocian mediante `work_instruction_defects`.
- Los colaboradores asignados se relacionan mediante `work_instruction_collaborators`.
- La modalidad es `rate` o `full_time`:
  - `rate`: utiliza `inspection_rate_per_hour` para estimar horas teóricas.
  - `full_time`: conserva las horas reales calculadas con inicio y fin.
- Puede existir una IT principal firmada y varios documentos complementarios. Solo una evidencia por instrucción debe tener `is_main_it = 1`.

## 4. Reportes de inspección

- Un reporte pertenece a una instrucción de trabajo.
- La captura actual requiere instrucción de trabajo y fecha de inicio; el problema puede heredarse de la instrucción.
- Después de crear el reporte, la interfaz continúa con el primer detalle de inspección.
- Los campos históricos `po_number`, `po_hours` y `description` permanecen en el esquema por compatibilidad, pero no forman parte del formulario operativo actual.
- El reporte agrupa todos sus detalles, cajas, cantidades, defectos y evidencias.

## 5. Detalles y cajas

- Un detalle representa la jornada o captura de un inspector dentro de un reporte.
- Un detalle admite hasta 20 cajas en `inspection_detail_serial_numbers`.
- Cada caja requiere al menos serie o lote. Una caja solo con lote guarda `serial_number` como `NULL`.
- La serie se normaliza en mayúsculas y no puede repetirse dentro del mismo detalle.
- Varias cajas solo con lote pueden compartir el mismo lote porque conservan IDs distintos.
- Por cada caja se capturan enteros no negativos:
  - inspeccionadas;
  - rechazadas;
  - retrabajadas.
- Aceptadas es de solo lectura y se calcula como `inspeccionadas - rechazadas`.
- Rechazadas no puede superar inspeccionadas.
- Los totales del detalle son la suma de sus cajas.
- La creación del detalle y sus cajas usa una transacción SQL.

Campos obligatorios del detalle:

- al menos una caja válida;
- inspector;
- turno numérico;
- fecha de inspección;
- fecha de manufactura;
- hora de inicio;
- hora de fin.

Reglas de fecha y tiempo:

- La manufactura no puede ser posterior a la inspección.
- La hora de fin debe ser estrictamente posterior a la hora de inicio.
- Las horas trabajadas se calculan con inicio y fin para ese inspector; no se multiplican por colaboradores.
- La semana se deriva de la fecha de inspección.
- Las horas estimadas por rate son `round(inspeccionadas / rate, 2)` y nunca sustituyen las horas trabajadas.

## 6. Defectos e incidentes

- Un defecto capturado se asocia a una caja concreta del detalle.
- Solo se ofrecen los defectos asociados a la instrucción de trabajo.
- Una caja puede distribuir sus rechazadas entre varios defectos.
- Cada cantidad debe ser un entero mayor que cero.
- La suma de defectos de cada caja debe coincidir exactamente con sus piezas rechazadas antes de finalizar el detalle.
- Un incidente conserva `defect_id` y un `defect_label` de respaldo para compatibilidad histórica.
- La evidencia es opcional y puede capturarse con cámara o seleccionarse como archivo.

Persistencia:

- Al crear un detalle, cajas y defectos permanecen pendientes en el navegador hasta guardar el detalle.
- Después de crear el detalle, se cargan las evidencias y se registran los incidentes pendientes.
- Si falla un defecto después de crear el detalle, el detalle no se elimina; se informa cuáles deben volver a agregarse.
- Al editar un detalle existente, cada caja y defecto se guarda con su acción individual; los datos generales se guardan con Guardar detalle.

## 7. Portal del cliente y exportación

- El portal consolida reportes por fecha y turno sin duplicar horas, cajas o defectos.
- La vista resumida muestra totales y descripciones consolidadas.
- Excel conserva el desglose individual de cajas, series, lotes, cantidades y defectos.
- La exportación genera una fila por defecto y caja; una caja sin defectos conserva una fila.
- RATE y FULL TIME mantienen sus cálculos actuales.

## 8. Archivos

- Evidencias, documentos y fotografías se almacenan en MongoDB GridFS (`argos_mongo`).
- MySQL almacena las referencias resultantes, no el archivo binario.
- Las rutas de archivos se sirven desde las API del frontend en `ArgosFrontEnd/src/app/api/media/`.
- El proyecto no usa S3 actualmente.

## 9. Reglas de seguridad y mantenimiento

- No confiar en controles ocultos del frontend para autorización.
- Toda ruta accesible al rol Cliente debe filtrar dentro del handler.
- No bloquear `/users/details` ni `/users/change-password`: todos los roles los necesitan.
- Fechas y horas deben pasar por los helpers existentes; no convertir cadenas DATE con `new Date()`.
- Para mostrar un defecto histórico usar `COALESCE(defects.name, incidents.defect_label)`.
- Toda migración aplicada localmente debe reflejarse en el esquema base y aplicarse explícitamente en la VPS.

## 10. Fuentes relacionadas

- Modelo de datos: [`DATA_MODEL.md`](DATA_MODEL.md)
- Referencia de API: [`../ArgosBackEnd/API_REFERENCE.md`](../ArgosBackEnd/API_REFERENCE.md)
- Despliegue: [`../DEPLOYMENT.md`](../DEPLOYMENT.md)
- Cambios funcionales: [`RELEASE_NOTES.md`](RELEASE_NOTES.md)
