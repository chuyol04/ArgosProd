-- Migration: Drop permissions tables
-- Description: Remove the permissions and role_permissions tables as we're moving to hardcoded role-based access control
-- Date: 2026-01-09

-- Drop dependent table first (has foreign keys to both tables)
DROP TABLE IF EXISTS role_permissions;

-- Drop permissions table
DROP TABLE IF EXISTS permissions;

-- Note: The following tables are KEPT:
-- - roles (stores role names: Inspector, Manager, Admin)
-- - user_roles (links users to their roles)
