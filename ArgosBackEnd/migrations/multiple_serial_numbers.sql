-- Migration: support multiple serial numbers per inspection detail (box)
-- Moves inspection_details.serial_number (single value) into a new child
-- table, one row per serial number, then drops the old column.

USE argos_db;

CREATE TABLE IF NOT EXISTS inspection_detail_serial_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_detail_id INT NOT NULL,
    serial_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (inspection_detail_id) REFERENCES inspection_details(id) ON DELETE CASCADE,
    UNIQUE KEY uq_inspection_detail_serial (inspection_detail_id, serial_number)
);

INSERT INTO inspection_detail_serial_numbers (inspection_detail_id, serial_number)
SELECT id, UPPER(TRIM(serial_number))
FROM inspection_details
WHERE serial_number IS NOT NULL AND TRIM(serial_number) <> '';

ALTER TABLE inspection_details DROP COLUMN serial_number;
