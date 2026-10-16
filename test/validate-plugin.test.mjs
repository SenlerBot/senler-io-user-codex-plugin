import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validatePlugin } from '../scripts/validate-plugin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const plugin = 'plugins/senler-io-user';
const manifest = `${plugin}/.codex-plugin/plugin.json`;
function fixture(t) {
  const path = mkdtempSync(resolve(tmpdir(), 'senler-user-package-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  for (const file of ['.agents', 'plugins', 'package.json', 'LICENSE', 'CHANGELOG.md']) cpSync(resolve(root, file), resolve(path, file), { recursive: true });
  return path;
}
function editJson(root, path, change) {
  const target = resolve(root, path);
  const data = JSON.parse(readFileSync(target, 'utf8'));
  change(data);
  writeFileSync(target, JSON.stringify(data));
}

test('validates the distributable package and its matching release tag', t => {
  assert.deepEqual(validatePlugin(fixture(t), { releaseTag: 'v0.1.1' }), { name: 'senler-io-user', version: '0.1.1', skills: 2 });
});
test('rejects an asset reference outside the installed package', t => {
  const root = fixture(t);
  editJson(root, manifest, data => { data.interface.logo = './../outside.svg'; });
  assert.throws(() => validatePlugin(root), /escapes its package/);
});
test('rejects a symlink to a file outside the installed package', t => {
  const root = fixture(t);
  const asset = resolve(root, plugin, 'assets/icon.svg');
  rmSync(asset);
  symlinkSync(resolve(root, 'LICENSE'), asset);
  assert.throws(() => validatePlugin(root), /symlink escapes/);
});
test('rejects a missing onboarding skill', t => {
  const root = fixture(t);
  editJson(root, manifest, data => { data.extensions['com.openai'].onboardingSkill = './skills/missing/SKILL.md'; });
  assert.throws(() => validatePlugin(root), /Onboarding skill: referenced path does not exist/);
});
test('rejects mismatched OAuth resources', t => {
  const root = fixture(t);
  editJson(root, `${plugin}/.mcp.json`, data => { data.mcpServers['senler-io-user'].oauth_resource += '?auth_mode=oauth'; });
  assert.throws(() => validatePlugin(root), /OAuth resource must equal/);
});
test('rejects embedded authentication settings without printing their value', t => {
  const root = fixture(t);
  editJson(root, `${plugin}/.mcp.json`, data => { data.mcpServers['senler-io-user'].headers = { Authorization: 'fixture credential' }; });
  assert.throws(() => validatePlugin(root), error => /credentials do not belong/.test(error.message) && !error.message.includes('fixture credential'));
});
test('rejects a credential-like value in a packaged skill', t => {
  const root = fixture(t);
  const path = resolve(root, plugin, 'skills/senler-io-user/SKILL.md');
  const credential = `mcp_sk_${'a'.repeat(40)}`;
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n${credential}\n`);
  assert.throws(() => validatePlugin(root), error => /credential-like value/.test(error.message) && !error.message.includes(credential));
});
test('rejects a skill with an undiscoverable name', t => {
  const root = fixture(t);
  const path = resolve(root, plugin, 'skills/senler-io-user/SKILL.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('name: senler-io-user', 'name: wrong-name'));
  assert.throws(() => validatePlugin(root), /name must match/);
});
test('rejects mismatched release tags and package versions', t => {
  const root = fixture(t);
  assert.throws(() => validatePlugin(root, { releaseTag: 'v0.1.2' }), /Release tag differs/);
  editJson(root, 'package.json', data => { data.version = '0.1.2'; });
  assert.throws(() => validatePlugin(root), /Version differs/);
});
