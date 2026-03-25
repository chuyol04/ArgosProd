/**
 * Role constants for hardcoded role-based access control.
 * These match the roles in the database `roles` table.
 *
 * Usage in handlers:
 *   import { ROLES, hasRole, isAdmin } from '../lib/constants/roles.js';
 *   if (!isAdmin(req.user.roles)) {
 *     return res.status(403).json({ success: false, motive: 'Forbidden' });
 *   }
 */

export const ROLES = {
    INSPECTOR: 'Inspector',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
};

/**
 * Check if user has a specific role
 * @param {string[]} userRoles - Array of user's roles
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function hasRole(userRoles, role) {
    return userRoles?.includes(role) ?? false;
}

/**
 * Check if user has any of the specified roles
 * @param {string[]} userRoles - Array of user's roles
 * @param {string[]} roles - Roles to check
 * @returns {boolean}
 */
export function hasAnyRole(userRoles, roles) {
    return roles.some(role => userRoles?.includes(role));
}

/**
 * Check if user is an admin
 * @param {string[]} userRoles - Array of user's roles
 * @returns {boolean}
 */
export function isAdmin(userRoles) {
    return hasRole(userRoles, ROLES.ADMIN);
}

/**
 * Check if user is a manager or admin
 * @param {string[]} userRoles - Array of user's roles
 * @returns {boolean}
 */
export function isManagerOrAbove(userRoles) {
    return hasAnyRole(userRoles, [ROLES.MANAGER, ROLES.ADMIN]);
}

export default {
    ROLES,
    hasRole,
    hasAnyRole,
    isAdmin,
    isManagerOrAbove,
};
