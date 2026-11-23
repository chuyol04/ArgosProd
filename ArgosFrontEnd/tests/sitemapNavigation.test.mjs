import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const sourceUrl = new URL('../src/app/(protected)/sitemap/data/sitemapData.ts', import.meta.url);
const compiled = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, { exports: compiled.exports, require: createRequire(sourceUrl), Map });
const { getVisibleCategories, sitemapData } = compiled.exports;
const paths = (roles) => Array.from(getVisibleCategories(roles).flatMap((category) => category.routes.map((route) => route.path)));

test('admins retain every existing operation, catalog and administration destination', () => {
    assert.deepEqual(paths(['Admin']), Array.from(sitemapData.flatMap((category) => category.routes.map((route) => route.path))));
    for (const path of ['/users', '/roles', '/media', '/clients', '/reportes-inspeccion']) assert.ok(paths(['Admin']).includes(path));
});

test('inspector and manager navigation excludes administrative favorites and destinations', () => {
    for (const roles of [['Inspector'], ['Manager']]) {
        const visible = paths(roles);
        for (const path of ['/users', '/roles', '/media']) assert.equal(visible.includes(path), false);
        assert.ok(visible.includes('/reportes-inspeccion'));
        assert.ok(visible.includes('/instrucciones-trabajo'));
        assert.equal(visible.length, 7);
    }
});

test('client portal navigation preserves the existing client-role precedence', () => {
    assert.deepEqual(paths(['Cliente']), ['/mis-reportes']);
    assert.deepEqual(paths(['Admin', 'Cliente']), ['/mis-reportes']);
    assert.equal(paths(['Admin']).length, 10, 'Filtering another role must not mutate the shared catalog');
});
