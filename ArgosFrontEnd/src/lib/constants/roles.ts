/**
 * Role constants for hardcoded role-based access control.
 * These match the roles in the database `roles` table.
 *
 * Usage in components:
 *   import { ROLES, hasRole } from '@/lib/constants/roles';
 *   if (hasRole(user.roles, ROLES.ADMIN)) { ... }
 *
 * Usage in middleware (when implemented):
 *   if (user.roles.includes(ROLES.ADMIN)) { ... }
 */

export const ROLES = {
    INSPECTOR: 'Inspector',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], role: Role): boolean {
    return userRoles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], roles: Role[]): boolean {
    return roles.some(role => userRoles.includes(role));
}

/**
 * Check if user is an admin
 */
export function isAdmin(userRoles: string[]): boolean {
    return hasRole(userRoles, ROLES.ADMIN);
}

/**
 * Check if user is a manager or admin
 */
export function isManagerOrAbove(userRoles: string[]): boolean {
    return hasAnyRole(userRoles, [ROLES.MANAGER, ROLES.ADMIN]);
}
