import { isClientRole } from '../constants/roles.js';

export function resolveClientScope(req, res) {
  const requester = res.locals.requester;

  if (requester && isClientRole(requester.roles)) {
    const clientId = Number(requester.client_id);
    const userId = Number(requester.id);
    return Number.isSafeInteger(clientId) && clientId > 0
      && Number.isSafeInteger(userId) && userId > 0
      ? { clientId, userId, invalid: false, denyAll: false }
      : { clientId: null, userId: null, invalid: false, denyAll: true };
  }

  const requested = req.query.client_id;
  if (requested === undefined || requested === null || requested === '') {
    return { clientId: null, userId: null, invalid: false, denyAll: false };
  }

  const clientId = Number(requested);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return { clientId: null, userId: null, invalid: true, denyAll: false };
  }

  return { clientId, userId: null, invalid: false, denyAll: false };
}

/**
 * Adds the SQL predicates required to scope a service-backed resource.
 * Admin/manager filtering uses only client_id. Client-portal users also need
 * an explicit assignment in service_client_users.
 */
export function appendServiceAccessScope(scope, conditions, params, serviceAlias = 's') {
  if (!scope?.clientId) return;

  conditions.push(`${serviceAlias}.client_id = ?`);
  params.push(scope.clientId);

  if (scope.userId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM service_client_users scu WHERE scu.service_id = ${serviceAlias}.id AND scu.user_id = ?)`
    );
    params.push(scope.userId);
  }
}
