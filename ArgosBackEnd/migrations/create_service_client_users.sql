-- Grant several client-portal users access to the reports of a service.
-- Existing client users are backfilled with every existing service owned by
-- their client so this migration does not remove access already in use.

USE argos_db;

CREATE TABLE IF NOT EXISTS service_client_users (
    service_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (service_id, user_id),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO service_client_users (service_id, user_id)
SELECT s.id, u.id
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'Cliente'
INNER JOIN services s ON s.client_id = u.client_id
WHERE u.is_active = 1;
