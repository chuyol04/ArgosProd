-- Migration: Create work_instruction_collaborators junction table
-- Links users (workers) to work instructions

USE ozcab_db;

CREATE TABLE IF NOT EXISTS work_instruction_collaborators (
    work_instruction_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (work_instruction_id, user_id),
    FOREIGN KEY (work_instruction_id) REFERENCES work_instructions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
