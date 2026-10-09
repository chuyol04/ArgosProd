import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientScope } from './clientScope.js';

const response = (requester = null) => ({ locals: { requester } });

test('resolveClientScope preserves all, selected, invalid and client-owned scopes', () => {
  assert.deepEqual(resolveClientScope({ query: {} }, response()), {
    clientId: null, invalid: false, denyAll: false,
  });
  assert.equal(resolveClientScope({ query: { client_id: '7' } }, response()).clientId, 7);
  assert.equal(resolveClientScope({ query: { client_id: 'x' } }, response()).invalid, true);
  assert.equal(
    resolveClientScope(
      { query: { client_id: '99' } },
      response({ roles: ['Cliente'], client_id: 3 })
    ).clientId,
    3
  );
});
