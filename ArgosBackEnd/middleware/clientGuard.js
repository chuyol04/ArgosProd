// middleware/clientGuard.js  (ESM)
//
// Read-only client-portal enforcement. Must run AFTER `verifySession`
// (needs res.locals.firebase_uid). Looks up the requester's roles/client_id
// directly from the DB on every request - this is the server-side source of
// truth; the frontend hiding buttons/menus is only a UX nicety, never the
// actual access boundary.
import userHelper from '../lib/helpers/userHelpers.js';
import { isClientRole } from '../lib/constants/roles.js';

async function getRequester(res) {
  const uid = res.locals.firebase_uid?.uid;
  if (!uid) return null;
  const { success, value } = await userHelper.getUserDetails(uid);
  return success ? value : null;
}

/**
 * Blocks the whole resource for the 'Cliente' role (any HTTP method).
 * Use on routers a client portal user should never reach (catalogs,
 * clients, services, users, work instructions, admin-only resources).
 */
export async function blockClientsEntirely(req, res, next) {
  const requester = await getRequester(res);
  if (requester && isClientRole(requester.roles)) {
    return res.status(403).json({ success: false, motive: 'Forbidden for client-portal users' });
  }
  res.locals.requester = requester;
  return next();
}

/**
 * Allows GET for the 'Cliente' role but blocks any write (POST/PUT/DELETE).
 * Use on routers the client portal needs to read (reports, inspection
 * details, incidents) - per-handler logic still scopes results to the
 * requester's own client_id.
 */
export async function blockClientWrites(req, res, next) {
  const requester = await getRequester(res);
  if (requester && isClientRole(requester.roles) && req.method !== 'GET') {
    return res.status(403).json({ success: false, motive: 'Client-portal users have read-only access' });
  }
  res.locals.requester = requester;
  return next();
}
