-- Apply before deploying the API. Safe to run again; preserves existing rows.
-- NULL lets different lot-only boxes coexist under the existing serial unique key.
ALTER TABLE inspection_detail_serial_numbers
  MODIFY COLUMN serial_number VARCHAR(50) NULL;
