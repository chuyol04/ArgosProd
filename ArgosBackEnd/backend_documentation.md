# OzCab Backend API Documentation

This document details the API endpoints for the OzCab backend, built with Node.js, Express.js, and MySQL. The backend is currently undergoing a refactoring process to standardize table and column names to English using `snake_case` conventions, and to improve modularity.

## 1. Backend Overview

The OzCab backend provides a RESTful API to manage various entities related to auditing manufacturing processes, including clients, services, parts, work instructions, inspections, users, roles, and permissions. It integrates with Firebase for user authentication.

**Technology Stack:**
*   **Language:** Node.js
*   **Framework:** Express.js
*   **Database:** MySQL
*   **ORM/DB Client:** `mysql2` with Promise API
*   **Authentication:** Firebase Admin SDK (for session verification), integrated with custom login/user endpoints.

## 2. Database Schema (`ozcab_db`)

The backend interacts with the `ozcab_db` database. The schema has been refactored for consistency and clarity. Key tables include:

*   **`clients`**: Stores information about client companies.
*   **`services`**: Represents contracts or projects for clients.
*   **`parts`**: Details about manufactured pieces to be inspected.
*   **`defects`**: A catalog of known defects (optional - incidents can also use free-text `defect_label` instead).
*   **`work_instructions`**: Defines how an inspection should be done for a specific part.
*   **`users`**: Stores user accounts, linked with Firebase UIDs. `client_id` (nullable) scopes a `Cliente`-role user to a single client for the read-only portal.
*   **`inspection_reports`**: Summaries of inspections for a batch of parts.
*   **`inspection_details`**: Detailed records of individual inspections within a report (a "box").
*   **`incidents`**: Records specific defects found during an inspection. `defect_id` is optional (nullable); `defect_label` holds the defect name when it wasn't picked from the `defects` catalog.
*   **`roles`**: Defines user roles: `Inspector`, `Manager`, `Admin`, `Cliente`. There are **no** `permissions`/`role_permissions` tables - access control is hardcoded by role name (see `lib/constants/roles.js` and `middleware/clientGuard.js`).
*   **`user_roles`**: Junction table assigning roles to users.
*   **`favorite_routes`**: Stores user-specific favorite UI routes.
*   **`work_instruction_evidence`**: Stores files attached to work instructions. `is_main_it` (0/1) marks the single signed IT file; everything else is an optional complementary document.

## 3. API Endpoints

The API is structured around resources, typically following RESTful conventions. All routes are prefixed by their resource name.

---

### 3.1 Authentication & User Management (Partially Refactored)

#### 3.1.1 Login

*   **Route:** `/login/submit`
*   **Method:** `POST`
*   **Handler:** `loginRoutes.js` -> `usersHandler.userLogin`
*   **Description:** Authenticates a user using email and password. Upon successful authentication, it generates a Firebase session cookie.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "yourpassword"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "firebaseAccess": {
        "success": true,
        "value": {
          "idToken": "...",
          "refreshToken": "..."
        }
      }
    }
    ```
*   **Response (Error - 401 Unauthorized / 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "unsuccesful authentication."
    }
    ```
*   **Response (Error - 500 Server Error):**
    ```json
    {
      "success": false,
      "motive": "Server Error"
    }
    ```

#### 3.1.2 User Details

*   **Route:** `/user/details` (Note: Backend route still `/user/details`, frontend calls `/user/details` via POST)
*   **Method:** `POST`
*   **Handler:** `userRoutes.js` -> `usersHandler.getUserDetails`
*   **Description:** Retrieves detailed information for a user based on their Firebase UID, which is extracted via middleware.
*   **Authentication:** Requires a valid session cookie.
*   **Request Body:** (Not explicitly used, `firebase_uid` is extracted from middleware `res.locals`)
    ```json
    {}
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "value": {
        "id": 1,
        "email": "user@example.com",
        "name": "User Name",
        "phone_number": "123-456-7890",
        "is_active": true,
        "roles": ["Inspector", "Manager"]
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "User not found"
    }
    ```
*   **Response (Error - 500 Server Error):**
    ```json
    {
      "success": false,
      "motive": "Server Error"
    }
    ```

#### 3.1.3 Create User

*   **Route:** `/users/create`
*   **Method:** `POST`
*   **Handler:** `userRoutes.js` -> `userHandler.createUser`
*   **Description:** Creates a Firebase Auth user (with a generated temporary password) and the corresponding MySQL row, optionally assigning a role and, for role `Cliente`, the client it's scoped to.
*   **Request Body:**
    ```json
    {
      "name": "New User",
      "email": "new.user@example.com",
      "phone_number": "987-654-3210",
      "role_id": 4,
      "client_id": 12
    }
    ```
*   **Required Parameters:** `name`, `email`. `client_id` is required (validated client-side) when `role_id` corresponds to the `Cliente` role - it scopes the user to that single client for the read-only portal.
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 17,
      "temp_password": "aZ3kP9qT",
      "motive": "User created successfully"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Client not found"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "Email already exists"
    }
    ```
*   **Response (Error - 500 Server Error):**
    ```json
    {
      "success": false,
      "motive": "Server Error"
    }
    ```

---

### 3.2 Clients Resource (`/clients`) - Fully Refactored

**Base Path:** `/clients` (Protected by `verifySession` middleware)

#### 3.2.1 Create Client

*   **Route:** `/clients/create`
*   **Method:** `POST`
*   **Handler:** `clientehandler.js` -> `createCliente`
*   **Description:** Creates a new client record.
*   **Request Body:**
    ```json
    {
      "name": "New Client Name",
      "contact_person": "Contact Person",
      "email": "client@example.com",
      "phone_number": "123-456-7890"
    }
    ```
*   **Required Parameters:** `name`, `email`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "motive": "Client created"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "name and email are required"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "Email already exists"
    }
    ```

#### 3.2.2 Get All Clients

*   **Route:** `/clients`
*   **Method:** `GET`
*   **Handler:** `clientehandler.js` -> `getClientes`
*   **Description:** Retrieves a list of all client records.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Acme Corp",
          "contact_person": "Alice Smith",
          "email": "alice.smith@acmecorp.com",
          "phone_number": "111-222-3333"
        }
      ]
    }
    ```

#### 3.2.3 Get Client by ID

*   **Route:** `/clients/:id`
*   **Method:** `GET`
*   **Handler:** `clientehandler.js` -> `getClienteById`
*   **Description:** Retrieves a single client record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the client.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "name": "Acme Corp",
        "contact_person": "Alice Smith",
        "email": "alice.smith@acmecorp.com",
        "phone_number": "111-222-3333"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Client not found"
    }
    ```

#### 3.2.4 Update Client

*   **Route:** `/clients/:id`
*   **Method:** `PUT`
*   **Handler:** `clientehandler.js` -> `updateCliente`
*   **Description:** Updates an existing client record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the client to update.
*   **Request Body:**
    ```json
    {
      "name": "Updated Client Name",
      "phone_number": "999-888-7777"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Client updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "ID is required in the path"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Client not found"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "Email already in use by another client"
    }
    ```

#### 3.2.5 Delete Client

*   **Route:** `/clients/:id`
*   **Method:** `DELETE`
*   **Handler:** `clientehandler.js` -> `deleteCliente`
*   **Description:** Deletes a client record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the client to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Client deleted"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "ID is required in the path"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Client not found"
    }
    ```
---

### 3.3 Roles Resource (`/roles`) - Fully Refactored

**Base Path:** `/roles` (Protected by `verifySession` middleware)

#### 3.3.1 Create Role

*   **Route:** `/roles/create`
*   **Method:** `POST`
*   **Handler:** `rolHandler.js` -> `createRol`
*   **Description:** Creates a new role.
*   **Request Body:**
    ```json
    {
      "name": "New Role",
      "description": "Description of the new role"
    }
    ```
*   **Required Parameters:** `name`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Role created"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "Name is required"
    }
    ```

#### 3.3.2 Get All Roles

*   **Route:** `/roles`
*   **Method:** `GET`
*   **Handler:** `rolHandler.js` -> `getRoles`
*   **Description:** Retrieves a list of all roles.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Inspector",
          "description": "Performs inspections and creates reports"
        }
      ]
    }
    ```

#### 3.3.3 Get Role by ID

*   **Route:** `/roles/:id`
*   **Method:** `GET`
*   **Handler:** `rolHandler.js` -> `getRolById`
*   **Description:** Retrieves a single role by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the role.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "name": "Inspector",
        "description": "Performs inspections and creates reports"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Role not found"
    }
    ```

#### 3.3.4 Update Role

*   **Route:** `/roles/:id`
*   **Method:** `PUT`
*   **Handler:** `rolHandler.js` -> `updateRol`
*   **Description:** Updates an existing role record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the role to update.
*   **Request Body:**
    ```json
    {
      "name": "Updated Inspector Role"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Role updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "ID is required in the path"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Role not found"
    }
    ```

#### 3.3.5 Delete Role

*   **Route:** `/roles/:id`
*   **Method:** `DELETE`
*   **Handler:** `rolHandler.js` -> `deleteRol`
*   **Description:** Deletes a role record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the role to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Role deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Role not found"
    }
    ```
---

### 3.4 Parts Resource (`/parts`) - Fully Refactored

**Base Path:** `/parts`

#### 3.4.1 Create Part

*   **Route:** `/parts/create`
*   **Method:** `POST`
*   **Handler:** `piezaHandler.js` -> `createPieza`
*   **Description:** Creates a new part record.
*   **Request Body:**
    ```json
    {
      "description": "Description of the new part"
    }
    ```
*   **Required Parameters:** `description`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Part created successfully"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "Description is required"
    }
    ```

#### 3.4.2 Get All Parts

*   **Route:** `/parts`
*   **Method:** `GET`
*   **Handler:** `piezaHandler.js` -> `getPiezas`
*   **Description:** Retrieves a list of all part records.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Widget A1",
          "description": "Small metallic widget"
        }
      ]
    }
    ```

#### 3.4.3 Get Part by ID

*   **Route:** `/parts/:id`
*   **Method:** `GET`
*   **Handler:** `piezaHandler.js` -> `getPiezaById`
*   **Description:** Retrieves a single part record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the part.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "name": "Widget A1",
        "description": "Small metallic widget"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Part not found"
    }
    ```

#### 3.4.4 Update Part

*   **Route:** `/parts/:id`
*   **Method:** `PUT`
*   **Handler:** `piezaHandler.js` -> `updatePieza`
*   **Description:** Updates an existing part record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the part to update.
*   **Request Body:**
    ```json
    {
      "description": "Updated description for Widget A1"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Part updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "ID is required in the path"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Part not found"
    }
    ```

#### 3.4.5 Delete Part

*   **Route:** `/parts/:id`
*   **Method:** `DELETE`
*   **Handler:** `piezaHandler.js` -> `deletePieza`
*   **Description:** Deletes a part record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the part to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Part deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Part not found"
    }
    ```
---

### 3.5 Defects Resource (`/defects`) - Fully Refactored

**Base Path:** `/defects`

#### 3.5.1 Create Defect

*   **Route:** `/defects/create`
*   **Method:** `POST`
*   **Handler:** `defectoHandler.js` -> `createDefecto`
*   **Description:** Creates a new defect record.
*   **Request Body:**
    ```json
    {
      "name": "New Defect Name",
      "description": "Description of the new defect"
    }
    ```
*   **Required Parameters:** `name`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Defect created successfully"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "Name is required"
    }
    ```

#### 3.5.2 Get All Defects

*   **Route:** `/defects`
*   **Method:** `GET`
*   **Handler:** `defectoHandler.js` -> `getDefectos`
*   **Description:** Retrieves a list of all defect records.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Scratch",
          "description": "Visible surface scratch"
        }
      ]
    }
    ```

#### 3.5.3 Get Defect by ID

*   **Route:** `/defects/:id`
*   **Method:** `GET`
*   **Handler:** `defectoHandler.js` -> `getDefectoById`
*   **Description:** Retrieves a single defect record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the defect.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "name": "Scratch",
        "description": "Visible surface scratch"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Defect not found"
    }
    ```

#### 3.5.4 Update Defect

*   **Route:** `/defects/:id`
*   **Method:** `PUT`
*   **Handler:** `defectoHandler.js` -> `updateDefecto`
*   **Description:** Updates an existing defect record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the defect to update.
*   **Request Body:**
    ```json
    {
      "name": "Minor Scratch"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Defect updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "ID is required in the path"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Defect not found"
    }
    ```

#### 3.5.5 Delete Defect

*   **Route:** `/defects/:id`
*   **Method:** `DELETE`
*   **Handler:** `defectoHandler.js` -> `deleteDefecto`
*   **Description:** Deletes a defect record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the defect to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Defect deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Defect not found"
    }
    ```
---

### 3.6 Work Instructions Resource (`/work-instructions`) - Fully Refactored

**Base Path:** `/work-instructions`

#### 3.6.1 Create Work Instruction

*   **Route:** `/work-instructions/create`
*   **Method:** `POST`
*   **Handler:** `instruccionTrabajoHandler.js` -> `createInstruccionTrabajo`
*   **Description:** Creates a new work instruction record. The "Pieza" field is free text now - send `part_name` and the backend finds an existing catalog row by name (case-insensitive) or creates one on the fly via `findOrCreatePartByName`. `part_id` is still accepted directly for backward compatibility (e.g. a pre-existing catalog pick), but `part_name` takes priority when both are present.
*   **Request Body:**
    ```json
    {
      "service_id": 1,
      "part_name": "Cover Plate RH",
      "description": "Detailed inspection steps for Part A1",
      "inspection_rate_per_hour": 10
    }
    ```
*   **Required Parameters:** `inspection_rate_per_hour`, `service_id`, and one of `part_name` / `part_id`.
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Work instruction created successfully"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "inspection_rate_per_hour and service_id are required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Service not found"
    }
    ```

#### 3.6.2 Get All Work Instructions

*   **Route:** `/work-instructions`
*   **Method:** `GET`
*   **Handler:** `instruccionTrabajoHandler.js` -> `getInstruccionesTrabajo`
*   **Description:** Retrieves a list of all work instruction records, including associated service details.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "service_id": 1,
          "part_id": 1,
          "description": "Detailed inspection for Widget A1",
          "inspection_rate_per_hour": 10,
          "start_date": "2023-01-01",
          "end_date": "2023-12-31"
        }
      ]
    }
    ```

#### 3.6.3 Get Work Instruction by ID

*   **Route:** `/work-instructions/:id`
*   **Method:** `GET`
*   **Handler:** `instruccionTrabajoHandler.js` -> `getInstruccionTrabajoById`
*   **Description:** Retrieves a single work instruction record by its ID, including associated service details.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the work instruction.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "service_id": 1,
        "part_id": 1,
        "description": "Detailed inspection for Widget A1",
        "inspection_rate_per_hour": 10,
        "start_date": "2023-01-01",
        "end_date": "2023-12-31"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Work instruction not found"
    }
    ```

#### 3.6.4 Update Work Instruction

*   **Route:** `/work-instructions/:id`
*   **Method:** `PUT`
*   **Handler:** `instruccionTrabajoHandler.js` -> `updateInstruccionTrabajo`
*   **Description:** Updates an existing work instruction record. Allows partial updates. `part_name` (free text) is also accepted here, same find-or-create behavior as create.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the work instruction to update.
*   **Request Body:**
    ```json
    {
      "description": "Revised inspection steps for Part A1",
      "part_name": "Cover Plate RH",
      "inspection_rate_per_hour": 12
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Work instruction updated successfully"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Work instruction not found"
    }
    ```
*   **Response (Error - 500 Server Error):**
    ```json
    {
      "success": false,
      "motive": "No record was updated"
    }
    ```

#### 3.6.5 Delete Work Instruction

*   **Route:** `/work-instructions/:id`
*   **Method:** `DELETE`
*   **Handler:** `instruccionTrabajoHandler.js` -> `deleteInstruccionTrabajo`
*   **Description:** Deletes a work instruction record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the work instruction to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Work instruction deleted successfully"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Work instruction not found"
    }
    ```

#### 3.6.6 Work Instruction Files (Evidence) - Main IT vs. Complementary Documents

Files attached to a work instruction live in `work_instruction_evidence`. Each row has `is_main_it` (0/1): **at most one** row per work instruction can have `is_main_it = 1` (the signed IT itself); everything else is an optional complementary document (safety sheets, supporting files, etc.).

*   **Add Evidence**
    *   **Route:** `/work-instructions/:id/evidence`
    *   **Method:** `POST`
    *   **Handler:** `instruccionTrabajoHandler.js` -> `addEvidence`
    *   **Description:** Attaches a file (already uploaded to GridFS - `file_url` is the `media_id`). If `is_main_it: true`, any previously-main evidence for this work instruction is demoted first, so there's never more than one main file.
    *   **Request Body:**
        ```json
        { "file_url": "<gridfs_media_id>", "comment": "optional label", "is_main_it": true }
        ```
    *   **Response (Success - 201 Created):** `{ "success": true, "id": 5, "motive": "Evidence added successfully" }`
*   **Set Main Evidence**
    *   **Route:** `/work-instructions/:id/evidence/:evidenceId/main`
    *   **Method:** `PUT`
    *   **Handler:** `instruccionTrabajoHandler.js` -> `setMainEvidence`
    *   **Description:** Reclassifies an already-uploaded file as the main signed IT (demoting whichever was main before), without re-uploading or deleting anything. Used to fix the classification of files uploaded before this distinction existed.
    *   **Response (Success - 200 OK):** `{ "success": true, "motive": "Evidence set as main IT" }`
*   **Delete Evidence**
    *   **Route:** `/work-instructions/:id/evidence/:evidenceId`
    *   **Method:** `DELETE`
    *   **Handler:** `instruccionTrabajoHandler.js` -> `deleteEvidence`
    *   **Response (Success - 200 OK):** `{ "success": true, "deleted_url": "<gridfs_media_id>", "motive": "Evidence deleted successfully" }`

`GET /work-instructions/:id` returns `evidences: [{ id, photo_url, comment, is_main_it }]`, ordered main-first.

---

### 3.7 Reports Resource (`/reports`) - Fully Refactored

**Base Path:** `/reports`

#### 3.7.1 Create Report

*   **Route:** `/reports/create`
*   **Method:** `POST`
*   **Handler:** `reporteHandler.js` -> `createReporte`
*   **Description:** Creates a new inspection report record.
*   **Request Body:**
    ```json
    {
      "work_instruction_id": 1,
      "start_date": "2023-01-15",
      "po_hours": 8.0,
      "description": "Report for the first batch of Widget A1",
      "problem": "Minor defects found in 5 units",
      "photo_url": "http://example.com/report_photo.jpg",
      "po_number": "PO-ACME-002"
    }
    ```
*   **Required Parameters:** `work_instruction_id`, `start_date`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "motive": "Report created successfully"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "work_instruction_id and start_date are required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Work instruction not found"
    }
    ```

#### 3.7.2 Get All Reports

*   **Route:** `/reports`
*   **Method:** `GET`
*   **Handler:** `reporteHandler.js` -> `getReportes`
*   **Description:** Retrieves a list of all inspection report records, including associated work instruction details, plus per-report aggregates across all of its inspection details (boxes): distinct inspector names and total inspected/accepted/rejected pieces.
*   **Access control:** if the requester's role is `Cliente`, results are always filtered to their own `client_id` (any `client_id`-like query param would be ignored - this is enforced server-side, not by the frontend).
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "work_instruction_id": 1,
          "start_date": "2023-01-10",
          "po_number": "PO-ACME-001",
          "po_hours": 5.0,
          "description": "First batch inspection of Widget A1",
          "problem": null,
          "photo_url": null,
          "work_instruction_description": "Detailed inspection for Widget A1",
          "inspector_names": "Jane Inspector, John Inspector",
          "total_inspected_pieces": 150,
          "total_accepted_pieces": 130,
          "total_rejected_pieces": 20
        }
      ]
    }
    ```

#### 3.7.3 Get Report by ID

*   **Route:** `/reports/:id`
*   **Method:** `GET`
*   **Handler:** `reporteHandler.js` -> `getReporteById`
*   **Description:** Retrieves a single inspection report record by its ID, including associated work instruction details and the full list of `inspections` (boxes), each with `manufacture_date` and `reworked_pieces` (in addition to serial/lot/dates/pieces/inspector).
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the report.
*   **Access control:** if the requester's role is `Cliente` and the report belongs to a different client, returns **404** (not 403) regardless of how the ID was obtained, including by typing it directly in a URL.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "work_instruction_id": 1,
        "start_date": "2023-01-10",
        "po_number": "PO-ACME-001",
        "po_hours": 5.0,
        "description": "First batch inspection of Widget A1",
        "problem": null,
        "photo_url": null,
        "work_instruction_description": "Detailed inspection for Widget A1"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Report not found"
    }
    ```

#### 3.7.4 Update Report

*   **Route:** `/reports/:id`
*   **Method:** `PUT`
*   **Handler:** `reporteHandler.js` -> `updateReporte`
*   **Description:** Updates an existing inspection report record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the report to update.
*   **Request Body:**
    ```json
    {
      "problem": "5 units with minor scratches, 2 with dents"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Report updated successfully"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "No fields to update"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Report not found"
    }
    ```

#### 3.7.5 Delete Report

*   **Route:** `/reports/:id`
*   **Method:** `DELETE`
*   **Handler:** `reporteHandler.js` -> `deleteReporte`
*   **Description:** Deletes an inspection report record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the report to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Report deleted successfully"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Report not found"
    }
    ```

#### 3.7.6 Export Report to Excel

*   **Route:** `/reports/:id/export`
*   **Method:** `GET`
*   **Handler:** `reporteHandler.js` -> `exportReporteToExcel`
*   **Description:** Generates an `.xlsx` workbook with a summary sheet and a "Detalles de Inspección" sheet with **one row per defect per box** (a box with no defects still gets exactly one row, so none are ever dropped). Columns, in order: Cliente, Servicio, Inspector, Fecha Inspección, Hora Inicio, Hora Fin, Horas Trabajadas, Pieza, # Serie, # Lote, Fecha Manufactura, Caja, Piezas Inspeccionadas/Aceptadas/Rechazadas/Retrabajadas, **Problema / Condición Revisada**, Defecto, Cantidad del Defecto, Evidencia. Access control is the same as Get Report by ID (404 if the report isn't the requester's own client).

---

### 3.8 Inspection Details Resource (`/inspection-details`) - Fully Refactored

**Base Path:** `/inspection-details`

#### 3.8.1 Create Inspection Detail

*   **Route:** `/inspection-details/create`
*   **Method:** `POST`
*   **Handler:** `detalleInspeccionRoutes.js` -> `createDetalleInspeccion`
*   **Description:** Creates a new detailed inspection record for a specific report.
*   **Request Body:**
    ```json
    {
      "inspection_report_id": 1,
      "part_id": 1,
      "inspector_id": 1,
      "serial_number": "SN001-A",
      "lot_number": "LOT-XYZ",
      "inspected_pieces": 50,
      "accepted_pieces": 48,
      "rejected_pieces": 2,
      "reworked_pieces": 0,
      "week": 1,
      "inspection_date": "2023-01-16",
      "manufacture_date": "2023-01-10",
      "hours": 1.5,
      "start_time": "08:00:00",
      "end_time": "09:30:00",
      "shift": "Morning",
      "comments": "Inspected first batch of Part A"
    }
    ```
*   **Required Parameters:** `part_id`, `inspection_report_id`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Inspection detail created"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "part_id and inspection_report_id are required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Part not found"
    }
    ```

#### 3.8.2 Get All Inspection Details

*   **Route:** `/inspection-details`
*   **Method:** `GET`
*   **Handler:** `detalleInspeccionRoutes.js` -> `getDetallesInspeccion`
*   **Description:** Retrieves a list of all detailed inspection records, including associated part, report, and inspector details. `report_problem` is the parent report's "Problema / Condición Revisada" (what the inspector is supposed to be looking for) - not to be confused with `incidents`/defects, which are what was actually found.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "inspection_report_id": 1,
          "inspector_id": 1,
          "serial_number": "SN001",
          "lot_number": "LOT001",
          "inspected_pieces": 100,
          "accepted_pieces": 95,
          "rejected_pieces": 5,
          "reworked_pieces": 0,
          "week": 2,
          "inspection_date": "2023-01-10",
          "manufacture_date": "2023-01-05",
          "hours": 2.5,
          "start_time": "09:00:00",
          "end_time": "11:30:00",
          "shift": "Morning",
          "comments": "5 pieces rejected due to scratches",
          "part_name": "Widget A1",
          "part_description": "Small metallic widget",
          "report_po_number": "PO-ACME-001",
          "report_start_date": "2023-01-10",
          "report_problem": "Golpe / Falta de ranura",
          "inspector_name": "Inspector Jane"
        }
      ]
    }
    ```

#### 3.8.3 Get Inspection Detail by ID

*   **Route:** `/inspection-details/:id`
*   **Method:** `GET`
*   **Handler:** `detalleInspeccionRoutes.js` -> `getDetalleInspeccionById`
*   **Description:** Retrieves a single detailed inspection record by its ID, including associated part, report, and inspector details.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the detailed inspection.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "inspection_report_id": 1,
        "inspector_id": 1,
        "serial_number": "SN001",
        "lot_number": "LOT001",
        "inspected_pieces": 100,
        "accepted_pieces": 95,
        "rejected_pieces": 5,
        "reworked_pieces": 0,
        "week": 2,
        "inspection_date": "2023-01-10",
        "manufacture_date": "2023-01-05",
        "hours": 2.5,
        "start_time": "09:00:00",
        "end_time": "11:30:00",
        "shift": "Morning",
        "comments": "5 pieces rejected due to scratches",
        "part_name": "Widget A1",
        "part_description": "Small metallic widget",
        "report_po_number": "PO-ACME-001",
        "report_start_date": "2023-01-10",
        "report_problem": "Golpe / Falta de ranura",
        "inspector_name": "Inspector Jane"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Inspection Detail not found"
    }
    ```

#### 3.8.4 Update Inspection Detail

*   **Route:** `/inspection-details/:id`
*   **Method:** `PUT`
*   **Handler:** `detalleInspeccionRoutes.js` -> `updateDetalleInspeccion`
*   **Description:** Updates an existing detailed inspection record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the detailed inspection to update.
*   **Request Body:**
    ```json
    {
      "accepted_pieces": 98,
      "comments": "Reworked 3 pieces, now accepted"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Inspection Detail updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "No fields to update"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Inspection Detail not found"
    }
    ```

#### 3.8.5 Delete Inspection Detail

*   **Route:** `/inspection-details/:id`
*   **Method:** `DELETE`
*   **Handler:** `detalleInspeccionRoutes.js` -> `deleteDetalleInspeccion`
*   **Description:** Deletes a detailed inspection record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the detailed inspection to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Inspection Detail deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Inspection Detail not found"
    }
    ```
---

### 3.9 Incidents Resource (`/incidents`) - Fully Refactored

**Base Path:** `/incidents`

#### 3.9.1 Create Incident

*   **Route:** `/incidents/create`
*   **Method:** `POST`
*   **Handler:** `incidenciaHandler.js` -> `createIncidencia`
*   **Description:** Creates a new defect/incident associated with a detailed inspection (a "box"). The defect **does not require the catalog** - it can be captured as free text via `defect_label`. At least one of `defect_id` (catalog) or `defect_label` (free text) is required; `defect_id` is purely an optional shortcut that pre-fills the label on the frontend.
*   **Request Body:**
    ```json
    {
      "defect_id": 1,
      "defect_label": "Golpe",
      "inspection_detail_id": 1,
      "quantity": 2,
      "evidence_url": "<gridfs_media_id>"
    }
    ```
*   **Required Parameters:** `inspection_detail_id`, and at least one of `defect_id` / `defect_label`.
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 4,
      "motive": "Incident created"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "defect_id or defect_label (free text) is required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Defect not found"
    }
    ```

#### 3.9.2 Get All Incidents

*   **Route:** `/incidents`
*   **Method:** `GET`
*   **Handler:** `incidenciaHandler.js` -> `getIncidencias`
*   **Description:** Retrieves a list of all incident records, including associated defect and inspection details. `defect_name` is `COALESCE(catalog name, defect_label)` - it always resolves to something display-ready regardless of whether the defect came from the catalog or free text.
*   **Access control:** if the requester's role is `Cliente`, results are filtered to incidents on boxes belonging to their own client.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "inspection_detail_id": 1,
          "defect_id": null,
          "defect_label": "Golpe",
          "quantity": 5,
          "evidence_url": "<gridfs_media_id>",
          "defect_name": "Golpe",
          "defect_description": null,
          "inspection_serial_number": "SN001",
          "inspection_lot_number": "LOT001"
        }
      ]
    }
    ```

#### 3.9.3 Get Incident by ID

*   **Route:** `/incidents/:id`
*   **Method:** `GET`
*   **Handler:** `incidenciaHandler.js` -> `getIncidenciaById`
*   **Description:** Retrieves a single incident record by its ID, including associated defect and inspection details.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the incident.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "inspection_detail_id": 1,
        "defect_id": 1,
        "quantity": 5,
        "evidence_url": "http://example.com/incident_scratch.jpg",
        "defect_name": "Scratch",
        "inspection_serial_number": "SN001",
        "inspection_lot_number": "LOT001"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Incident not found"
    }
    ```

#### 3.9.4 Update Incident

*   **Route:** `/incidents/:id`
*   **Method:** `PUT`
*   **Handler:** `incidenciaHandler.js` -> `updateIncidencia`
*   **Description:** Updates an existing incident record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the incident to update.
*   **Request Body:**
    ```json
    {
      "quantity": 3
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Incident updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "No fields to update"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Incident not found"
    }
    ```

#### 3.9.5 Delete Incident

*   **Route:** `/incidents/:id`
*   **Method:** `DELETE`
*   **Handler:** `incidenciaHandler.js` -> `deleteIncidencia`
*   **Description:** Deletes an incident record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the incident to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Incident deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Incident not found"
    }
    ```
---

### 3.10 User Roles Resource (`/user-roles`) - Fully Refactored

**Base Path:** `/user-roles`

#### 3.10.1 Assign Role to User

*   **Route:** `/user-roles/create`
*   **Method:** `POST`
*   **Handler:** `rolesUsuariosHandler.js` -> `createRolUsuario`
*   **Description:** Assigns a specific role to a user.
*   **Request Body:**
    ```json
    {
      "user_id": 1,
      "role_id": 1
    }
    ```
*   **Required Parameters:** `user_id`, `role_id`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "motive": "Role assigned to user",
      "user_id": 1,
      "role_id": 1
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "user_id and role_id are required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "User not found"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "User already has this role assigned"
    }
    ```

#### 3.10.2 Get All User Role Assignments

*   **Route:** `/user-roles`
*   **Method:** `GET`
*   **Handler:** `rolesUsuariosHandler.js` -> `getRolesUsuarios`
*   **Description:** Retrieves a list of all user-role assignments.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "user_id": 1,
          "user_name": "Inspector Jane",
          "user_email": "jane.inspector@ozcab.com",
          "role_id": 1,
          "role_name": "Inspector"
        }
      ]
    }
    ```

#### 3.10.3 Get Roles for a Specific User

*   **Route:** `/user-roles/user/:user_id`
*   **Method:** `GET`
*   **Handler:** `rolesUsuariosHandler.js` -> `getRolUsuarioById` (now `getUserRolesByUserId`)
*   **Description:** Retrieves all role assignments for a specific user.
*   **Path Parameters:**
    *   `user_id`: `INT` - The ID of the user.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "user_id": 1,
          "user_name": "Inspector Jane",
          "user_email": "jane.inspector@ozcab.com",
          "role_id": 1,
          "role_name": "Inspector"
        }
      ]
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "No roles found for this user"
    }
    ```

#### 3.10.4 Unassign Role from User

*   **Route:** `/user-roles`
*   **Method:** `DELETE`
*   **Handler:** `rolesUsuariosHandler.js` -> `deleteRolUsuario`
*   **Description:** Removes a specific role assignment for a user.
*   **Request Body:**
    ```json
    {
      "user_id": 1,
      "role_id": 1
    }
    ```
*   **Required Parameters:** `user_id`, `role_id`
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "User role assignment deleted"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "user_id and role_id are required for deletion"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "User role assignment not found"
    }
    ```
---

### 3.11 Favorite Routes Resource (`/favorite-routes`) - Fully Refactored

**Base Path:** `/favorite-routes`

#### 3.11.1 Create Favorite Route

*   **Route:** `/favorite-routes/create`
*   **Method:** `POST`
*   **Handler:** `rutasFavoritasHandler.js` -> `createRutaFavorita`
*   **Description:** Marks a UI route as a favorite for a user.
*   **Request Body:**
    ```json
    {
      "user_id": 1,
      "route_path": "/inspections/create"
    }
    ```
*   **Required Parameters:** `user_id`, `route_path`
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "motive": "Favorite route created"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "user_id and route_path are required"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "User not found"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "This route is already marked as favorite by this user"
    }
    ```

#### 3.11.2 Get All Favorite Routes

*   **Route:** `/favorite-routes`
*   **Method:** `GET`
*   **Handler:** `rutasFavoritasHandler.js` -> `getRutasFavoritas`
*   **Description:** Retrieves a list of all favorite route assignments, including associated user details.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "user_id": 1,
          "route_path": "/inspections/create",
          "user_name": "Inspector Jane",
          "user_email": "jane.inspector@ozcab.com"
        }
      ]
    }
    ```

#### 3.11.3 Get Favorite Route by ID

*   **Route:** `/favorite-routes/:id`
*   **Method:** `GET`
*   **Handler:** `rutasFavoritasHandler.js` -> `getRutaFavoritaById`
*   **Description:** Retrieves a single favorite route record by its ID, including associated user details.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the favorite route.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "user_id": 1,
        "route_path": "/inspections/create",
        "user_name": "Inspector Jane",
        "user_email": "jane.inspector@ozcab.com"
      }
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Record not found"
    }
    ```

#### 3.11.4 Update Favorite Route

*   **Route:** `/favorite-routes/:id`
*   **Method:** `PUT`
*   **Handler:** `rutasFavoritasHandler.js` -> `updateRutaFavorita`
*   **Description:** Updates an existing favorite route record. Allows partial updates.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the favorite route to update.
*   **Request Body:**
    ```json
    {
      "route_path": "/clients/view"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Record updated"
    }
    ```
*   **Response (Error - 400 Bad Request):**
    ```json
    {
      "success": false,
      "motive": "No fields to update"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Record not found"
    }
    ```
*   **Response (Error - 409 Conflict):**
    ```json
    {
      "success": false,
      "motive": "That favorite already exists for this user and route"
    }
    ```

#### 3.11.5 Delete Favorite Route

*   **Route:** `/favorite-routes/:id`
*   **Method:** `DELETE`
*   **Handler:** `rutasFavoritasHandler.js` -> `deleteRutaFavorita`
*   **Description:** Deletes a favorite route record by its ID.
*   **Path Parameters:**
    *   `id`: `INT` - The ID of the favorite route to delete.
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "motive": "Record deleted"
    }
    ```
*   **Response (Error - 404 Not Found):**
    ```json
    {
      "success": false,
      "motive": "Record not found"
    }
    ```
---

### 3.12 Remaining Endpoints (To Be Refactored)

The following endpoints are identified but have not yet been refactored to the new schema and naming conventions. They currently use the old Spanish names and might have outdated logic.

*   `/inspection`: `inspectionRouter` (legacy prototype, not mounted/used by the current frontend)

**Note:** The `/users` endpoint currently maps `userRouter` which uses `userRoutes.js`. This also needs full refactoring to align with the new `users` table and `IUser` interface.

---

### 3.13 Access Control & Client Portal

Access control is hardcoded by role name (no `permissions`/`role_permissions` tables - that approach was dropped in favor of simple role checks). Four roles exist: `Inspector`, `Manager`, `Admin`, `Cliente`.

`middleware/clientGuard.js` (applied per-router in `app.js`, right after `verifySession`) enforces the `Cliente` role's read-only client portal:

| Middleware | Applied to | Effect for role `Cliente` |
|---|---|---|
| `blockClientsEntirely` | `/users`, `/clients`, `/roles`, `/parts`, `/defects`, `/work-instructions`, `/user-roles`, `/favorite-routes`, `/services`, `/media` | 403 on every method |
| `blockClientWrites` | `/reports`, `/inspection-details`, `/incidents` | 403 on `POST`/`PUT`/`DELETE`; `GET` allowed |

Both middlewares populate `res.locals.requester` (`{ id, roles, client_id, ... }`) so handlers don't re-query the DB. On the GET endpoints a `Cliente` user can reach, the handlers themselves additionally scope every query to `requester.client_id`:

*   `GET /reports`, `GET /reports/:id`, `GET /reports/:id/export` - filtered/404'd by the report's client.
*   `GET /inspection-details`, `GET /inspection-details/:id` - filtered/404'd by the box's client.
*   `GET /incidents`, `GET /incidents/:id` - filtered/404'd by the underlying box's client.

This means a `Cliente` user can never see another client's data, **even by guessing/typing an ID directly in a URL** - the restriction lives in the SQL, not just in what the frontend chooses to render or link to.

A user gets the `Cliente` role like any other role (via `/roles` + `POST /users/create` or `PUT /users/:id` with `role_id`), plus `client_id` set to the client they should be scoped to.
