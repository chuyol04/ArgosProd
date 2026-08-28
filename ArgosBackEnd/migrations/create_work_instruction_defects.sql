-- Link the expected defect catalog to each work instruction.

USE argos_db;

CREATE TABLE IF NOT EXISTS work_instruction_defects (
    work_instruction_id INT NOT NULL,
    defect_id INT NOT NULL,
    PRIMARY KEY (work_instruction_id, defect_id),
    FOREIGN KEY (work_instruction_id) REFERENCES work_instructions(id) ON DELETE CASCADE,
    FOREIGN KEY (defect_id) REFERENCES defects(id) ON DELETE CASCADE
);
