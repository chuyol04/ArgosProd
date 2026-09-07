ALTER TABLE work_instructions
  ADD COLUMN inspection_mode ENUM('rate', 'full_time') NOT NULL DEFAULT 'rate' AFTER problem,
  ADD COLUMN start_date DATE NULL AFTER inspection_mode,
  MODIFY COLUMN inspection_rate_per_hour INT NULL;

UPDATE work_instructions wi
INNER JOIN services s ON s.id = wi.service_id
SET wi.start_date = s.start_date
WHERE wi.start_date IS NULL;

ALTER TABLE inspection_detail_serial_numbers
  ADD COLUMN lot_number VARCHAR(50) NULL AFTER serial_number;

UPDATE inspection_detail_serial_numbers sn
INNER JOIN inspection_details idt ON idt.id = sn.inspection_detail_id
SET sn.lot_number = idt.lot_number
WHERE sn.lot_number IS NULL;

-- Existing rows without any legacy lot stay visible as "Sin lote"; new and
-- edited rows are validated by the API. Keep the column nullable for them.
