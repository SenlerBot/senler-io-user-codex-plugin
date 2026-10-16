import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const runner = fileURLToPath(new URL('./run-checks.mjs', import.meta.url));
const gate = fileURLToPath(new URL('../../aibot-api/scripts/development/dispatch-heavy-task.sh', import.meta.url));
const command = existsSync(gate) ? 'sh' : process.execPath;
const args = existsSync(gate)
  ? [gate, '--repo', 'senler-io-user-codex-plugin', '--task', 'check', '--', process.execPath, runner]
  : [runner];
const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
if (result.error) console.error(`Cannot run plugin checks: ${result.error.code ?? 'process error'}`);
process.exit(result.status ?? 1);
