# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OzCab is a manufacturing audit/inspection management system. The MVP focuses on inspecting, approving, and rejecting manufactured parts. The project is a full-stack application with separate `back/` and `front/` directories.

## Commands

### Backend (`/back`)
```bash
# Development server with hot reload
npm run dev

# Production start
npm start
```

### Frontend (`/front`)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

### Database
- Schema: `back/new_mysql_schema.sql`
- Mock data: `back/populate_mock_data.sql`
- Connection: MySQL via mysql2 promise pool, credentials in `back/.env`

## Architecture

### Backend (Express.js + MySQL)
- **Framework**: Express 5, ESM JavaScript
- **Database**: MySQL via mysql2 with promise-based pool (`back/connections/mysqldb.js`)
- **Auth**: Firebase Admin SDK for session cookie verification
- **Pattern**: Routes → Handlers → MySQL queries

Route files in `back/routes/` define endpoints and map to handler functions in `back/handlers/`. All protected routes use the `verifySession` middleware which validates Firebase session cookies and stores `firebase_uid` in `res.locals`.

API response format:
```js
{ success: true/false, data?: any, motive?: string }
```

**API Endpoints** (all protected except `/login`):
- `/login` - Authentication
- `/users`, `/clients`, `/roles`, `/parts`, `/defects`
- `/work-instructions`, `/reports`, `/inspection-details`, `/incidents`
- `/user-roles`, `/favorite-routes`, `/services`

### Frontend (Next.js 15 App Router + TypeScript)
- **UI**: shadcn-ui components (in `src/components/ui/`), Tailwind CSS v4
- **State**: React Context (UserContext for user/permissions)
- **Auth**: Firebase Client SDK with BFF pattern via API routes
- **URL State**: nuqs for query parameter management
- **Data Mutations**: Server Actions pattern

**Route Groups:**
- `(auth)/` - Public auth pages (login)
- `(protected)/` - Protected pages requiring authentication

**Feature Structure** (`front/src/app/(protected)/<feature>/`):
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
- Permissions follow `resource.action` format (e.g., `clients.view`, `inspections.create`)
- Roles have permissions via `role_permissions` table
- Frontend middleware enforces route-level permissions
- Three default roles: Inspector, Manager, Admin

### Sitemap & Navigation
- **Source of truth**: `front/src/app/(protected)/sitemap/map.json`
- Contains categories with routes, each route has:
  - `id`: Unique identifier for favorites
  - `name`: Display name
  - `path`: URL path
  - `permission`: Required permission to view
- Used by: Sidebar, SiteMap page, Home favorites section

### Favorites System
- Users can star routes in sitemap
- Stored in `favorite_routes` table with `route_id` (references map.json id)
- Server actions in `front/src/app/(protected)/favorite-routes/actions/`
- Displayed on Home page grouped by category

## Domain Model

```
Client → Service (contract period)
  └→ WorkInstruction (inspection spec for a Part)
       └→ InspectionReport
            └→ InspectionDetail (inspector's work log)
                 └→ Incident (if defect found) → Defect (catalog)
```

## Current Implementation Status

### Completed Features
- Authentication flow (Firebase + session cookies)
- Protected layout with Header/Sidebar navigation
- Sitemap with permission-based route filtering
- Favorites system (star routes, display on home)
- Clients table with:
  - Server-side pagination
  - URL state management (nuqs)
  - Search filter
  - Update modal with server actions
  - Delete functionality

### Patterns to Follow

**Server Actions** (for data mutations):
```typescript
// front/src/app/(protected)/<feature>/actions/<feature>.actions.ts
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

## LLM Knowledge Base

For detailed context, patterns, and code templates, see:
- `back/llm/knowledge_dump.txt` - Complete project knowledge, architecture, patterns, and status
- `back/llm/code_templates.txt` - Copy-paste ready templates for new features
- `back/llm/q&a.txt` - Business logic Q&A from stakeholder
