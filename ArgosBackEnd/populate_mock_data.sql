-- SQL script to populate the Argos database with mock data

USE argos_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (preserves admin user)
TRUNCATE TABLE favorite_routes;
TRUNCATE TABLE user_roles;
TRUNCATE TABLE roles;
TRUNCATE TABLE incidents;
TRUNCATE TABLE inspection_details;
TRUNCATE TABLE inspection_reports;
TRUNCATE TABLE work_instruction_evidence;
TRUNCATE TABLE work_instruction_collaborators;
TRUNCATE TABLE work_instructions;
TRUNCATE TABLE defects;
TRUNCATE TABLE parts;
TRUNCATE TABLE services;
TRUNCATE TABLE clients;
DELETE FROM users WHERE email != 'admin@admin.com';

-- 1. clients
INSERT INTO clients (id, name, contact_person, email, phone_number) VALUES
(1, 'Acme Corp',       'Alice Smith',   'alice.smith@acmecorp.com',  '111-222-3333'),
(2, 'Globex Inc.',     'Bob Johnson',   'bob.johnson@globex.com',    '444-555-6666'),
(3, 'Initech S.A.',    'Carlos Ruiz',   'carlos.ruiz@initech.mx',    '664-100-2030'),
(4, 'Umbrella Mfg.',   'Diana Prince',  'diana@umbrella-mfg.com',    '664-300-5050');

-- 2. services
INSERT INTO services (id, client_id, name, start_date, end_date) VALUES
(1, 1, 'Monthly Quality Audit',        '2024-01-01', '2024-12-31'),
(2, 2, 'Batch Inspection Project',     '2024-03-15', '2024-09-30'),
(3, 3, 'Sorting & Rework Contract',    '2024-05-01', '2025-04-30'),
(4, 4, 'Final Assembly Inspection',    '2024-06-01', NULL);

-- 3. parts
INSERT INTO parts (id, name, description) VALUES
(1, 'Widget A1',   'Small metallic widget'),
(2, 'Gadget X2',   'Electronic gadget component'),
(3, 'Bolt M8',     'Standard M8 bolt'),
(4, 'Bracket B3',  'Stamped steel bracket'),
(5, 'Cover Plate', 'Plastic protective cover');

-- 4. defects
INSERT INTO defects (id, name, description) VALUES
(1, 'Scratch',         'Visible surface scratch'),
(2, 'Dent',            'Minor indentation'),
(3, 'Misalignment',    'Component out of alignment'),
(4, 'Burr',            'Sharp metallic burr on edge'),
(5, 'Wrong Color',     'Incorrect paint or finish color'),
(6, 'Missing Part',    'Required sub-component absent');

-- 5. work_instructions
INSERT INTO work_instructions (id, service_id, part_id, description, inspection_rate_per_hour) VALUES
(1, 1, 1, 'Detailed inspection for Widget A1',       100),
(2, 1, 2, 'Visual check for Gadget X2',              250),
(3, 2, 3, 'Torque test for Bolt M8',                 150),
(4, 3, 4, 'Dimensional check for Bracket B3',        200),
(5, 4, 5, '100% visual inspection for Cover Plate',  300);

-- 6. users (fake firebase UIDs — for mock data only, cannot login)
INSERT INTO users (id, firebase_uid, name, email, phone_number, is_active) VALUES
(2, 'mock_firebase_inspector1', 'Juan Pérez',    'juan.perez@argos.com',   '664-111-0001', TRUE),
(3, 'mock_firebase_inspector2', 'María López',   'maria.lopez@argos.com',  '664-111-0002', TRUE),
(4, 'mock_firebase_manager1',   'Carlos Soto',   'carlos.soto@argos.com',  '664-111-0003', TRUE);

-- 7. roles
INSERT INTO roles (id, name, description) VALUES
(1, 'Inspector', 'Performs inspections and creates reports'),
(2, 'Manager',   'Manages inspections, services, and users'),
(3, 'Admin',     'Full administrative access');

-- 8. user_roles (assign roles including existing admin)
INSERT INTO user_roles (user_id, role_id) VALUES
(2, 1), -- Juan Pérez → Inspector
(3, 1), -- María López → Inspector
(4, 2); -- Carlos Soto → Manager

-- Assign Admin role to admin@admin.com
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, 3 FROM users u WHERE u.email = 'admin@admin.com';

-- 9. inspection_reports
INSERT INTO inspection_reports (id, work_instruction_id, start_date, po_number, po_hours, description, problem, photo_url) VALUES
(1, 1, '2024-01-10', 'PO-ACME-001',  5.0,  'First batch inspection of Widget A1',        NULL,                          NULL),
(2, 2, '2024-03-20', 'PO-GLOB-005',  3.5,  'Initial check for Gadget X2 batch',          'Power fluctuations detected', NULL),
(3, 3, '2024-04-05', 'PO-GLOB-006',  8.0,  'Torque test Bolt M8 batch A',                NULL,                          NULL),
(4, 4, '2024-05-12', 'PO-INIT-010',  6.0,  'Bracket B3 dimensional check — week 20',     NULL,                          NULL),
(5, 5, '2024-06-01', 'PO-UMBR-021',  10.0, 'Cover Plate 100% visual — first shipment',   'Color mismatch in 3 units',   NULL);

-- 10. inspection_details
INSERT INTO inspection_details (
    id, inspection_report_id, inspector_id,
    serial_number, lot_number,
    inspected_pieces, accepted_pieces, rejected_pieces, reworked_pieces,
    week, inspection_date, manufacture_date,
    hours, start_time, end_time, shift, comments
) VALUES
(1, 1, 2, 'SN001', 'LOT001', 100,  95,  5, 0, 2,  '2024-01-10', '2024-01-05', 2.5, '09:00:00', '11:30:00', 'Morning',   '5 pieces rejected — scratches'),
(2, 1, 2, 'SN002', 'LOT001', 80,   78,  2, 0, 2,  '2024-01-10', '2024-01-05', 2.0, '11:30:00', '13:30:00', 'Morning',   '2 pieces rejected — dents'),
(3, 2, 3, 'SN003', 'LOT002', 150, 148,  2, 1, 12, '2024-03-20', '2024-03-10', 3.0, '14:00:00', '17:00:00', 'Afternoon', '1 reworked successfully'),
(4, 3, 2, 'SN004', 'LOT003', 200, 195,  5, 3, 15, '2024-04-05', '2024-04-01', 4.0, '07:00:00', '11:00:00', 'Morning',   '3 reworked, 2 scrapped'),
(5, 4, 3, 'SN005', 'LOT004', 300, 297,  3, 2, 20, '2024-05-12', '2024-05-08', 5.0, '08:00:00', '13:00:00', 'Morning',   'Minor burrs on edges'),
(6, 5, 2, 'SN006', 'LOT005', 500, 497,  3, 0, 23, '2024-06-01', '2024-05-28', 6.0, '06:00:00', '12:00:00', 'Morning',   '3 wrong color, returned to supplier');

-- 11. incidents
INSERT INTO incidents (id, inspection_detail_id, defect_id, quantity, evidence_url) VALUES
(1, 1, 1, 5, NULL),
(2, 2, 2, 2, NULL),
(3, 3, 3, 2, NULL),
(4, 4, 4, 5, NULL),
(5, 5, 4, 3, NULL),
(6, 6, 5, 3, NULL);

-- 12. work_instruction_evidence
INSERT INTO work_instruction_evidence (id, work_instruction_id, photo_url, comment) VALUES
(1, 1, NULL, 'Initial setup for Widget A1 inspection'),
(2, 2, NULL, 'Visual checkpoints for Gadget X2'),
(3, 4, NULL, 'Caliper measurements for Bracket B3');

-- 13. favorite_routes
INSERT INTO favorite_routes (id, user_id, route_id)
SELECT 1, u.id, 'reports-create' FROM users u WHERE u.email = 'admin@admin.com';

SET FOREIGN_KEY_CHECKS = 1;
