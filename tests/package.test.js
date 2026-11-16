/**
 * What the published package holds: the types a plugin compiles against, and the runtime module it loads.
 *
 * The names below are the ones the published @webship.co/workspace-* plugins import (read from their sources on
 * 2026-11-16): removing or renaming one breaks those plugins on their next install, so it must be a decision.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PKG = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
const dts = fs.readFileSync(path.join(PKG, 'index.d.ts'), 'utf8');

const IMPORTED_BY_PLUGINS = ['PluginApi', 'PluginLib', 'RowContext', 'ActionContext', 'FragmentContext', 'Form',
  'FolderSetupContext', 'PageContext', 'Html'];

test('the package points at its types and ships them', () => {
  assert.strictEqual(pkg.types, 'index.d.ts');
  assert.strictEqual(pkg.main, 'index.js');
  for (const f of ['index.d.ts', 'index.js', 'README.md']) {
    assert.ok(pkg.files.includes(f), `${f} is published`);
    assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the repository`);
  }
});

test('the runtime module is an empty object: the package is types, and loading it does nothing', () => {
  const mod = require(PKG);
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
