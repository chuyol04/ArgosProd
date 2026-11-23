# Argos — Modelo de datos

Actualizado: 23 de noviembre de 2026.

## Fuente de verdad

- Instalación limpia: `ArgosBackEnd/new_mysql_schema.sql`.
- Evolución de instalaciones existentes: `ArgosBackEnd/migrations/*.sql`.
- Base principal: MySQL `argos_db`.
- Archivos binarios: MongoDB GridFS `argos_mongo`.

Este documento explica relaciones; no sustituye las definiciones SQL ni las migraciones.

## Relación principal

```text
clients
  ├─< services
  │    ├─< work_instructions >─ parts
  │    │    ├─< work_instruction_defects >─ defects
  │    │    ├─< work_instruction_collaborators >─ users
  │    │    ├─< work_instruction_evidence
  │    │    └─< inspection_reports
  │    │          └─< inspection_details
  │    │                ├─< inspection_detail_serial_numbers (cajas)
  │    │                │     └─< incidents
  │    │                └─< incidents
  │    └─< service_client_users >─ users
  └─< users

users >─< roles mediante user_roles
users ─< favorite_routes
```

## Tablas

| Tabla | Propósito | Relaciones principales |
|---|---|---|
| `clients` | Cliente propietario de servicios y usuarios del portal. | 1:N con `services`; 1:N opcional con `users`. |
| `services` | Contrato o servicio prestado a un cliente. | N:1 con `clients`; 1:N con `work_instructions`; N:M con usuarios Cliente. |
| `parts` | Catálogo de piezas. | 1:N con `work_instructions`. |
| `defects` | Catálogo de defectos. | N:M con instrucciones; 1:N con incidentes. |
| `work_instructions` | Especificación de inspección para una pieza dentro de un servicio. | N:1 con servicio y pieza; 1:N con reportes y evidencias. |
| `work_instruction_defects` | Defectos permitidos o esperados por instrucción. | PK compuesta `work_instruction_id, defect_id`. |
| `work_instruction_collaborators` | Usuarios asignados a una instrucción. | PK compuesta `work_instruction_id, user_id`. |
| `work_instruction_evidence` | IT principal y documentos complementarios. | N:1 con instrucción; `is_main_it` distingue el principal. |
| `inspection_reports` | Cabecera operativa ligada a una instrucción. | N:1 con instrucción; 1:N con detalles. |
| `inspection_details` | Captura de jornada, inspector, fechas, turno y totales. | N:1 con reporte e inspector; 1:N con cajas e incidentes. |
| `inspection_detail_serial_numbers` | Cada fila representa una caja, con serie/lote y cantidades propias. | N:1 con detalle; 1:N con incidentes; borrado en cascada desde el detalle. |
| `incidents` | Defecto, cantidad y evidencia encontrados en una caja. | N:1 con detalle; N:1 opcional con caja y defecto. |
| `users` | Identidad local enlazada con Firebase. | N:M con roles; cliente opcional; asignaciones y favoritos. |
| `roles` | Roles por nombre. | N:M con usuarios mediante `user_roles`. |
| `user_roles` | Asignación de roles. | PK compuesta `user_id, role_id`. |
| `service_client_users` | Servicios visibles para usuarios del portal Cliente. | PK compuesta `service_id, user_id`. |
| `favorite_routes` | Rutas favoritas del usuario. | Única por usuario y ruta; `route_id` contiene el path del frontend. |

## Decisiones importantes

### Cajas y totales

- `inspection_details` mantiene campos de totales y compatibilidad histórica.
- La captura vigente almacena cantidades por caja en `inspection_detail_serial_numbers`.
- Los totales del detalle deben derivarse de esas cajas.
- `serial_number` puede ser `NULL`; `lot_number` identifica cajas sin serie.

### Incidentes

- `inspection_detail_serial_number_id` identifica la caja afectada.
- Su eliminación usa `ON DELETE SET NULL` para conservar incidentes históricos.
- `defect_id` puede ser nulo en datos históricos; `defect_label` conserva la etiqueta.

### Roles

- No existen `permissions` ni `role_permissions`.
- La autorización usa `roles`, `user_roles` y comprobaciones por nombre en el código.

### Archivos

- GridFS guarda el binario.
- Campos como `photo_url` y `evidence_url` guardan la referencia.
- Borrar una relación SQL no implica necesariamente borrar el archivo; deben utilizarse los helpers existentes.

## Migraciones registradas

| Migración | Objetivo |
|---|---|
| `multiple_serial_numbers.sql` | Introducir la tabla hija de cajas/seriales y migrar datos anteriores. |
| `add_counts_per_serial_and_incident_link.sql` | Cantidades por caja y vínculo del incidente con la caja. |
| `allow_lot_only_inspection_boxes.sql` | Permitir cajas sin serie. |
| `add_inspection_mode_start_date_and_serial_lots.sql` | Modalidad, fechas y datos de lote. |
| `add_work_instruction_problem.sql` | Condición o problema de la instrucción. |
| `create_work_instruction_defects.sql` | Defectos asociados a instrucciones. |
| `create_work_instruction_collaborators.sql` | Colaboradores asociados a instrucciones. |
| `create_service_client_users.sql` | Acceso de varios usuarios Cliente a servicios. |
| `drop_permissions_tables.sql` | Eliminar el modelo antiguo de permisos. |

La presencia de una migración no garantiza que ya se haya aplicado en una VPS. Antes de desplegar, comparar el esquema remoto siguiendo `DEPLOYMENT.md`.

## Reglas para cambios futuros

1. Modificar primero el modelo y la validación de negocio de forma explícita.
2. Crear una migración idempotente o documentar claramente por qué no puede serlo.
3. Actualizar `new_mysql_schema.sql` para instalaciones limpias.
4. Actualizar este documento y `BUSINESS_RULES.md`.
5. Probar creación, lectura, actualización, eliminación autorizada y compatibilidad histórica.
6. Respaldar MySQL antes de aplicar migraciones en la VPS.
