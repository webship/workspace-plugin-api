/**
 * What the published package holds: the types a plugin compiles against, and the runtime module it loads.
 * Node.js runs this file as it is (type stripping, from Node.js 22.18); `npm run lint` type-checks it.
 *
 * The names below are the ones the published @webship.co/workspace-* plugins import (read from their sources on
 * 2026-11-16): removing or renaming one breaks those plugins on their next install, so it must be a decision.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

/** The fields of package.json the tests read. */
interface PackageJson {
  types: string;
  main: string;
  files: string[];
  scripts: Record<string, string>;
}

const require = createRequire(import.meta.url);
const PKG: string = path.join(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')) as PackageJson;
const dts: string = fs.readFileSync(path.join(PKG, 'index.d.ts'), 'utf8');

const IMPORTED_BY_PLUGINS: readonly string[] = ['PluginApi', 'PluginLib', 'RowContext', 'ActionContext', 'FragmentContext', 'Form',
  'FolderSetupContext', 'PageContext', 'Html'];

test('the package points at its types and ships them', () => {
  assert.strictEqual(pkg.types, 'index.d.ts');
  assert.strictEqual(pkg.main, 'index.js');
  for (const f of ['index.d.ts', 'index.js', 'README.md']) {
    assert.ok(pkg.files.includes(f), `${f} is published`);
    assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
  }
});

test('the runtime module is built from a TypeScript source: no hand-written JavaScript in the repository', () => {
  assert.ok(fs.existsSync(path.join(PKG, 'src', 'index.ts')), 'src/index.ts is the source');
  assert.match(pkg.scripts.build ?? '', /tsc/, 'npm run build compiles it');
  assert.match(pkg.scripts.prepare ?? '', /build/, 'it is built before the package is packed');
  const ignored = fs.readFileSync(path.join(PKG, '.gitignore'), 'utf8').split('\n');
  assert.ok(ignored.includes('/index.js'), 'the built index.js is not committed');
});

test('the runtime module is an empty object: the package is types, and loading it does nothing', () => {
  const mod: unknown = require(PKG);
  assert.deepStrictEqual(mod, {});
});

test('every name the published plugins import is exported', () => {
  for (const name of IMPORTED_BY_PLUGINS) {
    assert.match(dts, new RegExp(`^export (interface|type) ${name}\\b`, 'm'), `${name} is exported`);
  }
});

test('the manifest type knows every key the plugins declare in their package.json', () => {
  const body = dts.slice(dts.indexOf('export interface WorkspacePluginManifest'), dts.indexOf('export type PluginNeed '));
  for (const key of ['name', 'label', 'settingsFile', 'settingsTemplate', 'workspace', 'commands', 'scripts', 'ddev', 'themes',
    'css', 'js', 'family', 'summary', 'features', 'ai', 'needs', 'suggests']) {
    assert.match(body, new RegExp(`^  ${key}\\?*:`, 'm'), `${key} is typed`);
  }
});
