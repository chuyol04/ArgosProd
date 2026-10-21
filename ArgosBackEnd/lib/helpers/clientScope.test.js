import test from 'node:test';
import assert from 'node:assert/strict';
import { appendServiceAccessScope, resolveClientScope } from './clientScope.js';

const response = (requester = null) => ({ locals: { requester } });

test('resolveClientScope preserves all, selected, invalid and client-owned scopes', () => {
  assert.deepEqual(resolveClientScope({ query: {} }, response()), {
    clientId: null, userId: null, invalid: false, denyAll: false,
  });
  assert.equal(resolveClientScope({ query: { client_id: '7' } }, response()).clientId, 7);
  assert.equal(resolveClientScope({ query: { client_id: 'x' } }, response()).invalid, true);
  assert.deepEqual(
    resolveClientScope(
      { query: { client_id: '99' } },
      response({ id: 12, roles: ['Cliente'], client_id: 3 })
    ),
    { clientId: 3, userId: 12, invalid: false, denyAll: false }
  );
  assert.equal(
    resolveClientScope(
      { query: {} },
      response({ roles: ['Cliente'], client_id: 3 })
    ).denyAll,
    true
  );
});

test('appendServiceAccessScope adds client and explicit service membership for portal users', () => {
  const conditions = [];
  const params = [];

  appendServiceAccessScope(
    { clientId: 3, userId: 12, invalid: false, denyAll: false },
    conditions,
    params,
    'service'
  );

  assert.deepEqual(params, [3, 12]);
  assert.equal(conditions[0], 'service.client_id = ?');
  assert.match(conditions[1], /service_client_users/);
  assert.match(conditions[1], /service\.id/);
});

test('appendServiceAccessScope keeps admin client filtering independent of portal assignments', () => {
  const conditions = [];
  const params = [];

  appendServiceAccessScope(
    { clientId: 7, userId: null, invalid: false, denyAll: false },
    conditions,
    params
  );

  assert.deepEqual(conditions, ['s.client_id = ?']);
  assert.deepEqual(params, [7]);
});
