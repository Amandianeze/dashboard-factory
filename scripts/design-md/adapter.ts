/**
 * The only module that talks to @google/design.md (pinned 0.4.0, format version "alpha").
 * It uses the CLI surface documented in the package README (lint / diff / export, JSON output),
 * so an upgrade that changes the format or flags touches this file only.
 * https://github.com/google-labs-code/design.md
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DESIGN_MD_VERSION = '0.4.0';
const BIN = join(process.cwd(), 'node_modules', '.bin', 'design.md');

export interface Finding {
  severity: 'error' | 'warning' | 'info';
  path?: string;
  message: string;
}
export interface LintReport {
  findings: Finding[];
  summary: { errors: number; warnings: number; infos: number };
}
export interface DiffReport {
  tokens: Record<string, { added: string[]; removed: string[]; modified: string[] }>;
  regression: boolean;
  [k: string]: unknown;
}

function run(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(BIN, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error) throw new Error(`design.md CLI failed to start: ${r.error.message}`);
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

function json<T>(out: { stdout: string; stderr: string }, what: string): T {
  try {
    return JSON.parse(out.stdout) as T;
  } catch {
    throw new Error(`design.md ${what}: expected JSON, got:\n${out.stdout}\n${out.stderr}`);
  }
}

/**
 * The README documents `-` for stdin, but 0.4.0 rejects it ("Missing required positional
 * argument: FILE"), so every call goes through a temp file.
 */
function tempFile(text: string, name = 'DESIGN.md'): string {
  const path = join(mkdtempSync(join(tmpdir(), 'design-md-')), name);
  writeFileSync(path, text);
  return path;
}

/** Lint DESIGN.md text. */
export function lint(text: string): LintReport {
  return json<LintReport>(run(['lint', '--format', 'json', tempFile(text)]), 'lint');
}

/** Compare two DESIGN.md texts. `regression` is true when "after" has more errors or warnings. */
export function diff(before: string, after: string): DiffReport {
  const a = tempFile(before, 'before.md');
  const b = tempFile(after, 'after.md');
  return json<DiffReport>(run(['diff', '--format', 'json', a, b]), 'diff');
}

/** Export the front-matter tokens as a DTCG token file. */
export function exportDtcg(text: string): Record<string, unknown> {
  return json<Record<string, unknown>>(
    run(['export', '--format', 'dtcg', tempFile(text)]),
    'export',
  );
}
