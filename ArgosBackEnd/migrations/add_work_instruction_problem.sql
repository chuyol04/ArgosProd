-- Store the reusable problem statement on the work instruction.

USE argos_db;

ALTER TABLE work_instructions ADD COLUMN problem TEXT AFTER description;
