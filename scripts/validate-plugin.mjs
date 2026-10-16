import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_NAME = 'senler-io-user';
const MARKETPLACE_NAME = 'senler-user';
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function inside(root, target) {
  const path = relative(root, target);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function packagePath(root, value, label, kind = 'file') {
  requireValue(typeof value === 'string' && value.startsWith('./'), `${label}: use a ./-prefixed path`);
  const target = resolve(root, value);
  requireValue(inside(root, target), `${label}: path escapes its package`);
  let real;
  try {
    real = realpathSync(target);
  } catch {
    throw new Error(`${label}: referenced path does not exist`);
  }
  requireValue(inside(realpathSync(root), real), `${label}: symlink escapes its package`);
  const stats = statSync(real);
  requireValue(kind === 'directory' ? stats.isDirectory() : stats.isFile(), `${label}: expected ${kind}`);
  return real;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`${label}: cannot read valid JSON`);
  }
}

function httpsUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label}: expected an absolute HTTPS URL`);
  }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.hash, `${label}: use HTTPS without credentials or fragments`);
  return url;
}

function inspectPackagedFiles(root, directory = root, visited = new Set()) {
  const real = realpathSync(directory);
  requireValue(inside(root, real), 'Packaged file symlink escapes its package');
  requireValue(!visited.has(real), 'Packaged directory contains a symlink cycle');
  visited.add(real);
  for (const entry of readdirSync(real, { withFileTypes: true })) {
    requireValue(!/^\.env(?:\.|$)/.test(entry.name) && !['.git', 'node_modules'].includes(entry.name), 'Package contains a private or dependency directory/file');
    const path = realpathSync(resolve(real, entry.name));
    requireValue(inside(root, path), 'Packaged file symlink escapes its package');
    if (statSync(path).isDirectory()) {
      inspectPackagedFiles(root, path, visited);
      continue;
    }
    const text = readFileSync(path, 'utf8');
    requireValue(!/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\bmcp_sk_[A-Za-z0-9_-]{20,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}|\bBearer\s+[A-Za-z0-9._~+/-]{20,}/.test(text), 'Package contains a credential-like value; remove it before distribution');
    if (entry.name.endsWith('.json')) readJson(path, 'Packaged JSON');
  }
  visited.delete(real);
}

function validateSkill(path, expectedName) {
  const text = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/.exec(text);
  requireValue(match, 'Skill: missing frontmatter or body');
  // These package skills deliberately use plain, single-line YAML scalars.
  const name = /^name: ([a-z0-9-]+)$/m.exec(match[1])?.[1];
  const description = /^description: (.+)$/m.exec(match[1])?.[1]?.trim();
  requireValue(name === expectedName && name.length <= 64, 'Skill: name must match its directory');
  requireValue(description && description.length <= 1024, 'Skill: provide a concise single-line description');
  requireValue(!/\[(?:TODO|TBD|PLACEHOLDER)(?:\b|:)/i.test(text), 'Skill: unfinished scaffold placeholder');
}

export function validatePlugin(root, { releaseTag } = {}) {
  root = realpathSync(root);
  const catalog = readJson(resolve(root, '.agents/plugins/marketplace.json'), 'Marketplace');
  requireValue(catalog.name === MARKETPLACE_NAME, 'Marketplace: unexpected stable identifier');
  requireValue(Array.isArray(catalog.plugins) && catalog.plugins.length === 1, 'Marketplace: expected one plugin');
  const entry = catalog.plugins[0];
  requireValue(entry.name === PLUGIN_NAME && entry.source?.source === 'local', 'Marketplace: unexpected plugin identity/source');
  requireValue(entry.policy?.installation === 'AVAILABLE' && entry.policy?.authentication === 'ON_INSTALL' && entry.category === 'Productivity', 'Marketplace: invalid install/authentication policy');
  const plugin = packagePath(root, entry.source.path, 'Marketplace source', 'directory');
  const manifest = readJson(resolve(plugin, '.codex-plugin/plugin.json'), 'Manifest');
  requireValue(manifest.name === entry.name, 'Manifest: name differs from marketplace entry');
  requireValue(stableVersion.test(manifest.version), 'Manifest: expected a stable major.minor.patch version');
  const metadata = readJson(resolve(root, 'package.json'), 'Package metadata');
  requireValue(metadata.version === manifest.version, 'Version differs between package and manifest');
  requireValue(manifest.license === 'MIT' && readFileSync(resolve(root, 'LICENSE'), 'utf8').startsWith('MIT License\n'), 'License file must match the manifest');
  requireValue(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8').split('\n').some(line => line.startsWith(`## ${manifest.version} — `)), 'Changelog is missing the current version');
  if (releaseTag) requireValue(releaseTag === `v${manifest.version}`, 'Release tag differs from manifest version');

  const skills = packagePath(plugin, manifest.skills, 'Skills', 'directory');
  const skillPaths = new Set();
  for (const entry of readdirSync(skills, { withFileTypes: true })) {
    const path = packagePath(skills, `./${entry.name}/SKILL.md`, 'Skill');
    validateSkill(path, entry.name);
    skillPaths.add(path);
  }
  requireValue(skillPaths.size > 0, 'Package must contain a skill');
  const onboarding = packagePath(plugin, manifest.extensions?.['com.openai']?.onboardingSkill, 'Onboarding skill');
  requireValue(skillPaths.has(onboarding), 'Onboarding skill is outside the declared skills');
  for (const field of ['composerIcon', 'logo']) packagePath(plugin, manifest.interface?.[field], field);
  requireValue(Array.isArray(manifest.interface?.screenshots), 'Screenshots must be an array');
  for (const path of manifest.interface.screenshots) packagePath(plugin, path, 'Screenshot');

  const mcp = readJson(packagePath(plugin, manifest.mcpServers, 'MCP config'), 'MCP config');
  requireValue(Object.keys(mcp.mcpServers ?? {}).join() === PLUGIN_NAME, 'MCP config: expected the user server only');
  const server = mcp.mcpServers[PLUGIN_NAME];
  requireValue(Object.keys(server).every(key => ['type', 'url', 'oauth_resource', 'note'].includes(key)), 'MCP config: unexpected connection field; credentials do not belong in the package');
  requireValue(server.type === 'http', 'MCP config: expected HTTP transport');
  const endpoint = httpsUrl(server.url, 'MCP endpoint');
  const resource = httpsUrl(server.oauth_resource, 'OAuth resource');
  requireValue(endpoint.hostname === 'mcp-senler-io-user.senler.io' && !endpoint.port && endpoint.pathname === '/mcp' && endpoint.search === '?auth_mode=oauth', 'MCP endpoint: expected the production User OAuth endpoint');
  requireValue(resource.href === `${endpoint.origin}${endpoint.pathname}`, 'OAuth resource must equal the MCP endpoint without connection parameters');
  inspectPackagedFiles(plugin);
  return { name: manifest.name, version: manifest.version, skills: skillPaths.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = validatePlugin(fileURLToPath(new URL('../', import.meta.url)), {
      releaseTag: process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined,
    });
    console.log(`Package OK: ${result.name} ${result.version}; ${result.skills} skills; paths, OAuth, release metadata and credential checks passed.`);
  } catch (error) {
    console.error(`Package validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
