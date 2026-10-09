import { isClientRole } from '../constants/roles.js';

export function resolveClientScope(req, res) {
  const requester = res.locals.requester;

  if (requester && isClientRole(requester.roles)) {
    const clientId = Number(requester.client_id);
    return Number.isSafeInteger(clientId) && clientId > 0
      ? { clientId, invalid: false, denyAll: false }
      : { clientId: null, invalid: false, denyAll: true };
  }

  const requested = req.query.client_id;
  if (requested === undefined || requested === null || requested === '') {
    return { clientId: null, invalid: false, denyAll: false };
  }

  const clientId = Number(requested);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return { clientId: null, invalid: true, denyAll: false };
  }

  return { clientId, invalid: false, denyAll: false };
}
