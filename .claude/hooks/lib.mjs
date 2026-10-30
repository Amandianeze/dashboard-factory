// Shared helpers for Claude Code hook scripts. Hooks receive a JSON payload on stdin.
// Exit 0 = ok. Exit 2 = blocking: stderr is fed back to Claude so it can fix the problem.
import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';

export const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

/** Run a command in the project root; returns { ok, output }. */
export function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { ok: r.status === 0, output: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

export const rel = (p) => relative(ROOT, p).split('\\').join('/');

/** Keep feedback short: Claude needs the first errors, not a 2,000-line log. */
export const tail = (text, lines = 40) => text.split('\n').slice(-lines).join('\n');

export function block(message) {
  process.stderr.write(message.trim() + '\n');
  process.exit(2);
}
