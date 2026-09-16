ALTER TABLE inspection_detail_serial_numbers
  ADD COLUMN inspected_pieces INT NULL AFTER lot_number,
  ADD COLUMN accepted_pieces INT NULL AFTER inspected_pieces,
  ADD COLUMN rejected_pieces INT NULL AFTER accepted_pieces,
  ADD COLUMN reworked_pieces INT NULL AFTER rejected_pieces;

ALTER TABLE incidents
  ADD COLUMN inspection_detail_serial_number_id INT NULL AFTER inspection_detail_id,
  ADD CONSTRAINT fk_incident_serial_number
    FOREIGN KEY (inspection_detail_serial_number_id)
    REFERENCES inspection_detail_serial_numbers(id)
    ON DELETE SET NULL;
