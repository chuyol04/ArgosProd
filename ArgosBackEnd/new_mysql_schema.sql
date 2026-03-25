-- SQL script to create the new OzCab database schema

-- Drop the database if it exists to allow for a clean creation
DROP DATABASE IF EXISTS argos_db;
CREATE DATABASE argos_db;
USE argos_db;

-- -----------------------------------------------------
-- Table `clients`
-- -----------------------------------------------------
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone_number VARCHAR(50) -- Added phone_number
);

-- -----------------------------------------------------
-- Table `services`
-- -----------------------------------------------------
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- -----------------------------------------------------
-- Table `parts`
-- -----------------------------------------------------
CREATE TABLE parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- -----------------------------------------------------
-- Table `defects`
-- -----------------------------------------------------
CREATE TABLE defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- -----------------------------------------------------
-- Table `work_instructions`
-- Renamed from 'it'
-- -----------------------------------------------------
CREATE TABLE work_instructions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    part_id INT NOT NULL,
    description VARCHAR(255),
    inspection_rate_per_hour INT NOT NULL, -- Number of pieces to be inspected per hour.
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(50), -- Changed from 'contact'
    is_active BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------
-- Table `inspection_reports`
-- Renamed from 'reporte_inspeccion'
-- -----------------------------------------------------
CREATE TABLE inspection_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_instruction_id INT NOT NULL,
    start_date DATE NOT NULL,
    po_number VARCHAR(50), -- Purchase Order Number
    po_hours DECIMAL(5,2),  -- Hours associated with the Purchase Order
    description TEXT,
    problem TEXT,
    photo_url TEXT,
    FOREIGN KEY (work_instruction_id) REFERENCES work_instructions(id)
);

-- -----------------------------------------------------
-- Table `inspection_details`
-- Renamed from 'detalle_inspeccion'
-- -----------------------------------------------------
CREATE TABLE inspection_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_report_id INT NOT NULL,
    inspector_id INT NOT NULL, -- Assumes 'inspector_id' is a 'user_id'.
    serial_number VARCHAR(50),
    lot_number VARCHAR(50),
    inspected_pieces INT,
    accepted_pieces INT,
    rejected_pieces INT,
    reworked_pieces INT,
    week TINYINT,
    inspection_date DATE,
    manufacture_date DATE,
    hours DECIMAL(5,2),
    start_time TIME,
    end_time TIME,
    shift VARCHAR(20),
    comments TEXT,
    FOREIGN KEY (inspection_report_id) REFERENCES inspection_reports(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
);

-- -----------------------------------------------------
-- Table `incidents`
-- Renamed from 'incidencias'
-- -----------------------------------------------------
CREATE TABLE incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_detail_id INT NOT NULL,
    defect_id INT NOT NULL,
    quantity INT,
    evidence_url TEXT,
    FOREIGN KEY (inspection_detail_id) REFERENCES inspection_details(id),
    FOREIGN KEY (defect_id) REFERENCES defects(id)
);

-- -----------------------------------------------------
-- Table `roles`
-- -----------------------------------------------------
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'Inspector', 'Manager', 'Admin'
    description TEXT
);

-- -----------------------------------------------------
-- Table `user_roles`
-- Renamed from 'roles_usuarios'
-- -----------------------------------------------------
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- -----------------------------------------------------
-- Table `favorite_routes`
-- Renamed from 'rutas_favoritas', simplified to store user's preferred frontend paths
-- route_id references the 'id' field in front/src/app/sitemap/types/map.json
-- -----------------------------------------------------
CREATE TABLE favorite_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    route_id VARCHAR(100) NOT NULL, -- References id from map.json, e.g., 'clients-view'
    UNIQUE KEY unique_user_route (user_id, route_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- -----------------------------------------------------
-- Table `work_instruction_evidence`
-- Re-instated from the old `evidencia_it` table to store evidence for work instructions.
-- -----------------------------------------------------
CREATE TABLE work_instruction_evidence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_instruction_id INT NOT NULL,
    photo_url TEXT,
    comment TEXT,
    FOREIGN KEY (work_instruction_id) REFERENCES work_instructions(id)
);

-- -----------------------------------------------------
-- Table `work_instruction_collaborators`
-- Junction table linking users (workers) to work instructions.
-- -----------------------------------------------------
CREATE TABLE work_instruction_collaborators (
    work_instruction_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (work_instruction_id, user_id),
    FOREIGN KEY (work_instruction_id) REFERENCES work_instructions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Removed Tables:
-- The old 'rutas', 'categoria', and 'privilegios' tables have been removed.
-- 'trabajadores_it' was deemed redundant.
-- 'permissions' and 'role_permissions' tables removed - using hardcoded role-based access control instead.
-- -----------------------------------------------------