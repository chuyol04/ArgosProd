# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OzCab is a manufacturing audit/inspection management system. The MVP focuses on inspecting, approving, and rejecting manufactured parts. The project is a full-stack application with separate `ArgosBackEnd/` and `ArgosFrontEnd/` directories.

## Canonical Project Context

Read these before changing domain behavior, database structure or the UI roadmap:

- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — current roles, inspection flow, calculations, persistence and security rules.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — current tables, relationships, storage and migration discipline.
- [`docs/UI_UX_ROADMAP.md`](docs/UI_UX_ROADMAP.md) — completed and pending UI/UX phases plus the compact validation protocol.

Executable code and `ArgosBackEnd/new_mysql_schema.sql` remain authoritative. If a historical note conflicts with the canonical documents, verify the current backend validations and update the documentation in the same change.

## Commands

### Backend (`ArgosBackEnd/`)
```bash
# Development server with hot reload
npm run dev

# Production start (what the Dockerfile runs)
node server.js
```
`npm start` is broken: it runs `bin/www`, leftover CommonJS (`require`) in an ESM package.

### Frontend (`ArgosFrontEnd/`)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

### Tests (from repo root)
```bash
node --test ArgosBackEnd/tests/*.test.js
node --experimental-strip-types --test ArgosFrontEnd/tests/*.test.mjs
```

### Local Docker stack
```bash
# MySQL (localhost:3307) + MongoDB (localhost:27017) only
docker compose -f docker-compose.dev.yml up -d mysql mongo
# Full stack (adds backend :3001 and frontend :3000)
docker compose -f docker-compose.dev.yml up -d
```

### Database
- Schema: `ArgosBackEnd/new_mysql_schema.sql`
- Mock data: `ArgosBackEnd/populate_mock_data.sql`
- Connection: MySQL via mysql2 promise pool, credentials in `ArgosBackEnd/.env`

## Architecture

### Backend (Express.js + MySQL)
- **Framework**: Express 5, ESM JavaScript
- **Database**: MySQL via mysql2 with promise-based pool (`ArgosBackEnd/connections/mysqldb.js`)
- **Auth**: Firebase Admin SDK for session cookie verification
- **Pattern**: Routes → Handlers → MySQL queries

Route files in `ArgosBackEnd/routes/` define endpoints and map to handler functions in `ArgosBackEnd/handlers/`. All protected routes use the `verifySession` middleware which validates Firebase session cookies and stores `firebase_uid` in `res.locals`.

API response format:
```js
{ success: true/false, data?: any, motive?: string }
```

**API Endpoints** (all protected except `/login`):
- `/login` - Authentication
- `/users`, `/clients`, `/roles`, `/parts`, `/defects`
- `/work-instructions`, `/reports`, `/inspection-details`, `/incidents`
- `/user-roles`, `/favorite-routes`, `/services`, `/media`

**File storage**: uploaded files (evidence, IT documents, photos) live in MongoDB GridFS (`argos_mongo`), served by the **frontend's** API routes `src/app/api/media/*` (`src/lib/db/mongoClient.ts`, `src/lib/storage/`). MySQL stores only the resulting URLs; the backend `/media` router just clears those URL references.

### Frontend (Next.js 15 App Router + TypeScript)
- **UI**: shadcn-ui components (in `src/components/ui/`), Tailwind CSS v4
- **State**: React Context (UserContext for user/permissions)
- **Auth**: Firebase Client SDK with BFF pattern via API routes
- **URL State**: nuqs for query parameter management
- **Data Mutations**: Server Actions pattern

**Route Groups:**
- `(auth)/` - Public auth pages (login)
- `(protected)/` - Protected pages requiring authentication

**Feature Structure** (`ArgosFrontEnd/src/app/(protected)/<feature>/`):
```
├── _components/    # Feature-specific components
├── actions/        # Server actions for data mutations
├── data/           # Data fetching functions
├── types/          # TypeScript interfaces
├── utils/          # Helper functions (parsers, etc.)
├── page.tsx        # Route page
```

**Key directories:**
- `src/components/ui/` - shadcn-ui components (Button, Dialog, Input, etc.)
- `src/components/layout/` - Header, Sidebar
- `src/lib/auth/` - Firebase client utilities
- `src/contexts/` - React contexts (UserContext)
- `src/middleware.ts` - Route protection and permission checks

### Layout Components
- **Header** (`src/components/layout/Header.tsx`) - Top navigation with home, sitemap, burger menu
- **Sidebar** (`src/components/layout/Sidebar.tsx`) - Slide-in navigation with categories/routes filtered by permissions
- **ProtectedLayoutWrapper** (`src/app/(protected)/_components/ProtectedLayoutWrapper.tsx`) - Combines Header + Sidebar with shared state
- **UserDataProvider** (`src/app/(protected)/_components/UserDataProvider.tsx`) - Fetches user data on mount, populates UserContext

### Auth Flow
1. User logs in via Firebase Client SDK on frontend
2. Frontend calls `/api/auth/handleLogin` which creates a session cookie
3. All protected API calls include the session cookie
4. Backend validates via Firebase Admin SDK
5. Frontend middleware fetches user permissions via `/api/auth/getCurrentUser` for route protection

### Permission System
- Hardcoded role-based access control (no `permissions`/`role_permissions` tables - removed early on). Roles are plain rows in `roles` + `user_roles`; checks are role-name string comparisons via `lib/constants/roles.js` (backend) and `src/lib/constants/roles.ts` (frontend).
- Four roles: **Inspector**, **Manager**, **Admin**, **Cliente**.
- **Cliente** is a read-only client-portal role (added for the "Mis Reportes" feature):
  - `users.client_id` (nullable FK to `clients`) scopes a Cliente user to exactly one client. Set via the admin Users modal when role = Cliente.
  - Backend enforcement (the real boundary - never just hidden UI) lives in `middleware/clientGuard.js`, applied per-router in `app.js`:
    - `blockClientsEntirely` - 403s any request from a Cliente user to `/users`, `/clients`, `/roles`, `/parts`, `/defects`, `/work-instructions`, `/user-roles`, `/favorite-routes`, `/services`, `/media`.
    - `blockClientWrites` - on `/reports`, `/inspection-details`, `/incidents`: allows `GET`, 403s any write. The handlers themselves (`reporteHandler.js`, `detalleInspeccionHandler.js`, `incidenciaHandler.js`) additionally scope every query to `requester.client_id` and 404 if a Cliente requests a report/detail/incident belonging to another client (even by guessing an ID in the URL).
  - Frontend `middleware.ts` confines Cliente users to `/mis-reportes` and `/cambiar-contrasena` (redirects everything else there) - this is UX only, not the security boundary.
  - Frontend pages: `(protected)/mis-reportes/page.tsx` (list) and `(protected)/mis-reportes/[id]/page.tsx` (detail) - both read-only Server Components that reuse the existing reports/incidents server actions (no separate client-aware fetchers needed, since the backend auto-scopes by role).
- **Inspector** restrictions, also in `clientGuard.js` and applied per-router in `app.js` (they only hit users whose roles are Inspector without Manager/Admin - `isInspectorOnly`):
  - `blockInspectorDeletes` - 403s every `DELETE`, on every protected router.
  - `blockInspectorCatalogWrites` - 403s any write to `/clients`, `/roles`, `/parts`, `/defects`, `/work-instructions`, `/user-roles`, `/services`, `/media`. Inspectors can still create/update reports, inspection details and incidents.
- **Global client selector** (staff only): the Header's client dropdown sets the `active_client_id` cookie (`ACTIVE_CLIENT_COOKIE` in `src/lib/clientScope.ts`); feature `data/`/`actions/` files forward it to the backend as `?client_id=`, and handlers resolve it with `resolveClientScope(req, res)` (`lib/helpers/clientScope.js`). For a Cliente user it always returns their own `users.client_id` (or `denyAll` if unset) and ignores the query param - that's what keeps the selector from widening a client's scope. Reuse it in any new client-filtered handler.

### Sitemap & Navigation
- **Source of truth**: `ArgosFrontEnd/src/app/(protected)/sitemap/types/map.json`
- Categories with routes; each route is just `{ name, path }` - no `id` and no per-route permission field. Role filtering is hardcoded in `Sidebar.tsx`/`Home.tsx`.
- Used by: Sidebar, SiteMap page, Home favorites section

### Favorites System
- Users can star routes in sitemap
- Stored in `favorite_routes.route_id`, which holds the route's **`path`** from map.json (not an id)
- Server actions in `ArgosFrontEnd/src/app/(protected)/favorite-routes/actions/`
- Displayed on Home page grouped by category

## Domain Model

```
Client → Service (contract period)
  └→ WorkInstruction (inspection spec for a Part)
       │    └→ WorkInstructionEvidence (1 main signed IT + N complementary docs, via is_main_it)
       └→ InspectionReport
            └→ InspectionDetail (inspector's work log)
                 └→ InspectionDetailSerialNumber (one box: series/lot + counts)
                      └→ Incident (defect, quantity + optional evidence)
                           → Defect (catalog; defect_label preserves history)

Client ← User (role 'Cliente', via users.client_id)
Service ←→ Client User (explicit access via service_client_users)
```

## Current Implementation Status

### Current rules (2026-11-23)

Canonical rules: [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md). Data model:
[`docs/DATA_MODEL.md`](docs/DATA_MODEL.md). Release/deploy checklist:
[`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md), [`DEPLOYMENT.md`](DEPLOYMENT.md).

- An inspection detail contains up to 20 boxes (`inspection_detail_serial_numbers`).
  Each box needs **series OR lot**. Empty series are stored as SQL NULL; repeated
  lot-only boxes keep distinct IDs. Apply `allow_lot_only_inspection_boxes.sql`
  before deploying to an existing database.
- Inspected, rejected and reworked are nonnegative integers entered per box;
  accepted is read-only = inspected minus rejected. Rejected cannot exceed
  inspected. Detail totals sum the boxes; creation uses one SQL transaction.
- A box may distribute its rejected pieces across several defects. Each quantity
  is a positive integer, and the final distribution must equal that box's rejected
  count. Evidence supports separate native camera/gallery inputs.
- Client report screen groups by date + shift, with totals and consolidated
  defect descriptions. No per-box cards. Excel retains the individual boxes,
  series, lots, counts and defects. Existing RATE/FULL TIME hours are preserved.
- Regression commands: `node --test ArgosBackEnd/tests/*.test.js` and
  `node --experimental-strip-types --test ArgosFrontEnd/tests/*.test.mjs`.

### Completed Features
- Authentication flow (Firebase + session cookies)
- Protected layout with Header/Sidebar navigation
- Sitemap with role-based route filtering
- Favorites system (star routes, display on home)
- Clients table with:
  - Server-side pagination
  - URL state management (nuqs)
  - Search filter
  - Update modal with server actions
  - Delete functionality
- **Date/time stabilization** across reports/inspection details:
  - MySQL pool uses `dateStrings: true` (`connections/mysqldb.js`) - DATE/TIME columns are never round-tripped through JS `Date` objects, avoiding timezone day-shift bugs.
  - `lib/helpers/dateTimeHelpers.js` (backend) and `src/lib/dateTimeUtils.ts` (frontend) centralize sanitization (`""` → `null`, never `'0000-00-00'`) and display formatting.
  - "Horas Trabajadas" in `InspectionDetailForm.tsx` is now read-only, auto-computed as `end_time - start_time` for that single inspector's box (never summed/multiplied across inspectors); `end_time` must be strictly after `start_time` (equal times are also invalid, not just `end < start`) - `calculateWorkedHours`/`isInvalidTimeRange` in `dateTimeUtils.ts` enforce this.
- **`po_hours`** (reports) widened to `DECIMAL(8,2)` and validated as an integer 1-9999 (frontend inline + backend 400) - same widening applied to `inspection_details.hours`.
- **Free-text defects**: `incidents.defect_id` is now nullable; new `incidents.defect_label VARCHAR(150)` holds a manually-typed defect when no catalog entry is used. `DefectsSection.tsx` lets the catalog (optional) pre-fill the free-text field; evidence can be removed from an existing defect without deleting the whole entry.
- **Excel export** (`exportReporteToExcel`) now emits one row per defect per box (repeating the box's data), with the columns described in the export's column-width config; boxes with zero defects still get exactly one row.
- **Work instruction files** split into "IT Principal" (one signed file, `work_instruction_evidence.is_main_it`) and "Documentos Complementarios" (many, optional). Files can be attached during *creation* now (queued locally, uploaded+linked right after the record is created - no orphaned GridFS files if creation fails) instead of requiring a save-then-edit round trip.
- **Client portal** ("Mis Reportes"): role `Cliente`, `users.client_id`, backend-enforced scoping in `middleware/clientGuard.js` + handler-level filtering - see Permission System above. `/users/details` and `/users/change-password` are intentionally **not** gated by `blockClientsEntirely` (every role, including Cliente, needs them to self-identify); only the admin-only user-management routes are gated, per-route, inside `userRoutes.js`.
- **Piece counts**: `SerialNumbersInput.tsx` captures inspected/rejected/reworked per box; accepted is calculated, not inspected. `InspectionDetailForm.tsx` displays the summed box totals. A non-blocking amber warning remains when total defect quantities differ from rejected pieces.
- **"Problema / Condición Revisada"**: `inspection_details` queries now also return `report_problem` (= `inspection_reports.problem`), shown read-only in `InspectionDetailForm.tsx` before the piece-count fields, and added as its own column in the Excel export (right after the piece counts, before the per-defect breakdown). It's distinct from a "Defecto" (what was actually found) - it's what the inspector is supposed to be looking for.
- **Free-text "Pieza" in Work Instructions**: `WorkInstructionModal.tsx`'s part field is now a text input (with a `<datalist>` of existing catalog names as suggestions) instead of a mandatory `<Select>`. The backend (`findOrCreatePartByName` in `instruccionTrabajoHandler.js`) resolves the typed name to an existing `parts` row (case-insensitive match) or creates a new one - `work_instructions.part_id` stays a valid FK either way, no schema change needed.
- **Home dashboard** (`(protected)/home/_components/Home.tsx`): a banner, a 5-step workflow strip (`WORKFLOW_ITEMS`: Reporte → Detalle → Revisión → Resultado → Excel), a quick-access card grid (`QUICK_ACCESS_ITEMS`; entries with `adminOnly: true` - Usuarios, Roles, Media - are shown only to Admin), and a "Favoritos" section that renders only when the user has starred routes. Role `Cliente` never reaches this page - `middleware.ts` redirects it to `/mis-reportes` before it renders.
- **"Rate de Inspección"** card in `InspectionDetailForm.tsx` (below "Conteo de Piezas"): shows the work instruction's `inspection_rate_per_hour` ("Rate Establecido"), the box's live `computedInspectedPieces`, and "Horas Estimadas por Rate" = `round(inspeccionadas / rate, 2)` - use `Math.round(x * 100) / 100`, not `.toFixed(2)`, since JS float rounding on values like `2.025` truncates down with `toFixed`. Falls back to "Rate no configurado" (`inspection_rate_per_hour` is `null`) or "Rate no válido" (rate is `0`, division skipped). Backend: `wi.inspection_rate_per_hour` added to the `getDetalleInspeccionById` join in `detalleInspeccionHandler.js`. This is distinct from "Horas Trabajadas" (real hours) - never conflate the two.
- **Defects captured before the inspection detail is saved**: `DefectsSection.tsx` works in two modes based on `inspectionDetailId`. When `null`, defects stay in memory until `createInspectionDetail` succeeds; then `commitPendingDefects` uploads evidence and creates each incident. A failed defect does not delete the new detail and is reported for recovery. Existing-detail defects persist individually and support edit, delete and evidence replacement. Several defects may share a box, but their quantities must exactly distribute its rejected pieces.
- **Multiple boxes per detail**: `inspection_detail_serial_numbers` stores up to 20 boxes per detail. Each row has its own series/lote and inspected/accepted/rejected/reworked counts. A box needs series or lot; lot-only boxes keep `serial_number = NULL`, and repeated lots remain distinct by row ID. Pending boxes are created with the detail; existing boxes persist individually. See `docs/BUSINESS_RULES.md` for current validation details.
- **Required-field validation** in `InspectionDetailForm.tsx` ("Número de serie o lote" - one of the two per box, Inspector, Turno, Fecha de Inspección, Fecha de Manufactura, Hora de Inicio, Hora de Fin - all marked with `*`): errors are computed continuously (`validateFormData`) but only surfaced once a field is blurred or Save is attempted (`touched`/`submitAttempted` state) - never immediately on opening the form. On a failed save, the first invalid field (in form order, via `fieldRefs`) is scrolled into view and focused. Red border comes from the existing `aria-invalid` styling already built into `Input`/`SelectTrigger` (`components/ui/input.tsx`/`select.tsx`) - no new styling needed, just pass `aria-invalid={!!error}`. "Turno" was changed from free text (`"Turno 1"`, `"Matutino"`) to a digits-only numeric field per this validation pass. "Fecha de Manufactura" must not be after "Fecha de Inspección"; "Hora de Fin" must be strictly after "Hora de Inicio" (see above). Time inputs got `lang="es-MX"` to push the native picker into 24h display (Chrome/Edge) - the stored value was always 24h `"HH:MM"` regardless.

### Patterns to Follow

**Server Actions** (for data mutations):
```typescript
// ArgosFrontEnd/src/app/(protected)/<feature>/actions/<feature>.actions.ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateSomething(id: number, data: Data) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  // Fetch to backend with session cookie
  // revalidatePath on success
}
```

**Modal Pattern** (for CRUD operations):
- Create modal component in `_components/`
- Use Dialog from shadcn-ui
- Fetch data with `useEffect` when modal opens
- Submit with `useTransition` for pending state
- Close modal on success, show error inline on failure

**Hydration Safety**:
- Use `mounted` state for client-only rendering to prevent hydration mismatches
- Return `null` until mounted when using browser-only APIs

**URL State with nuqs**:
```typescript
// utils/parsers.client.ts - define parsers
// component - useQueryState with parsers
const [qSearch, setQSearch] = useQueryState("search", searchParser);
```

## Codebase Notes

- Backend uses snake_case for database columns
- Handler functions still use Spanish names (e.g., `getPiezas` for parts) but query English table/column names
- Environment variables required in `.env` files for both front and back
- For pagination queries, use safe integer interpolation instead of prepared statement placeholders for LIMIT/OFFSET
- DATE/TIME values: always go through `sanitizeDateField`/`sanitizeTimeField` (backend) or the helpers in `src/lib/dateTimeUtils.ts` (frontend) - never `new Date(dbDateString)` for display/comparison, it reintroduces timezone bugs now that the pool returns plain strings.
- `incidents.defect_id` is optional; always read the defect name via `COALESCE(d.name, i.defect_label)`, never `d.name` alone.
- `work_instruction_evidence.is_main_it`: only one row per `work_instruction_id` should have this set to 1 - handlers that insert/update it must first reset existing mains for that work instruction (see `addEvidence`/`setMainEvidence` in `instruccionTrabajoHandler.js`).
- Any new endpoint reachable by a Cliente-role user (currently only `/reports`, `/inspection-details`, `/incidents`) must filter by the requester's `client_id` inside the handler itself - `res.locals.requester` is already populated by `clientGuard.js` middleware, no extra DB lookup needed.
- Never gate `/users/details` or `/users/change-password` with `blockClientsEntirely` - every authenticated role self-identifies through `/users/details` (frontend `middleware.ts` and `UserDataProvider` both depend on it); gating the whole `/users` router broke the Cliente role detection entirely in an earlier pass. Admin-only user management stays gated per-route inside `userRoutes.js`.
- `work_instructions.part_id` is still `NOT NULL`/FK - "free text" parts are implemented via find-or-create (`findOrCreatePartByName`), not by making the column nullable. Follow the same pattern (rather than a schema change) for any other field that needs to move from "mandatory catalog pick" to "free text, optionally backed by a catalog".
- Local dev DB lives in Docker (`docker-compose.dev.yml`, `argos_mysql` on `localhost:3307`, db `argos_db`, user `argos_user`/`argos_pass`); schema migrations applied there during development must also be added to `new_mysql_schema.sql` (and `populate_mock_data.sql` for seed data) and re-applied manually on the VPS.

## LLM Knowledge Base

For detailed context, patterns, and code templates, see:
- `ArgosBackEnd/llm/knowledge_dump.txt` - Complete project knowledge, architecture, patterns, and status
- `ArgosBackEnd/llm/code_templates.txt` - Copy-paste ready templates for new features
- `ArgosBackEnd/llm/q&a.txt` - Business logic Q&A from stakeholder

## Related Docs

- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) - canonical roles, workflow, calculations and persistence rules
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) - table relationships, storage and migrations
- [`docs/UI_UX_ROADMAP.md`](docs/UI_UX_ROADMAP.md) - completed and pending interface phases
- [`ArgosBackEnd/API_REFERENCE.md`](ArgosBackEnd/API_REFERENCE.md) - full endpoint-level request/response reference
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - VPS infrastructure, deploy workflow, incident history
