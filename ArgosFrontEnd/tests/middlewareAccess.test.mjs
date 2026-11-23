// Run: node --test tests/middlewareAccess.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server.js';

// Exercise the actual middleware and Next's matcher without a running backend.
const source = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const compiled = { exports: {} };
runInNewContext(outputText, {
  exports: compiled.exports,
  require: createRequire(import.meta.url),
  process,
  URL,
  console,
});
const { config, middleware } = compiled.exports;
const matches = (path) => unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${path}` });

test('the public login banner is exempt without exempting other WebP paths', () => {
  assert.equal(matches('/bannernuevo1.webp'), false);
  for (const path of ['/private.webp', '/media/private.webp', '/media/bannernuevo1.webp', '/bannernuevo1.webp/private']) {
    assert.equal(matches(path), true, path);
  }
});

test('private pages still redirect visitors without a session to login', async () => {
  for (const path of ['/home', '/users', '/roles', '/media', '/reportes-inspeccion', '/detalles-inspeccion', '/mis-reportes']) {
    assert.equal(matches(path), true, path);
    const response = await middleware(new NextRequest(`http://localhost:3000${path}`));
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get('location'), 'http://localhost:3000/login', path);
  }
});
