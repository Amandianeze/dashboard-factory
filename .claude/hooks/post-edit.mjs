// PostToolUse (Edit|MultiEdit|Write): format, lint, typecheck and validate specs right after each
// edit, so mistakes surface while Claude still has the context to fix them.
import { existsSync } from 'node:fs';
import { block, readInput, rel, run, tail } from './lib.mjs';

const input = await readInput();
const file = input.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);
const path = rel(file);
if (path.startsWith('..') || path.startsWith('node_modules/')) process.exit(0);

const problems = [];
const isCode = /\.(ts|tsx|js|mjs)$/.test(path);
const isSpec = /^dashboards\/.+\.dashboard\.ya?ml$/.test(path);
const isSchemaSource = /^src\/(spec|components\/d3\/catalog)/.test(path);

if (/\.(ts|tsx|js|mjs|json|css|md|ya?ml|html)$/.test(path))
  run('npx', ['prettier', '--write', path]);

if (isCode) {
  const lint = run('npx', ['eslint', '--max-warnings=0', path]);
  if (!lint.ok) problems.push(`ESLint (${path}):\n${tail(lint.output)}`);
  const tsc = run('npx', ['tsc', '--noEmit']);
  if (!tsc.ok) problems.push(`TypeScript:\n${tail(tsc.output)}`);
}

if (isSchemaSource) {
  // Schema or catalog changed: regenerate JSON Schema and re-validate every spec.
  run('npm', ['run', '-s', 'spec:schema']);
  const v = run('npm', ['run', '-s', 'spec:validate']);
  if (!v.ok) problems.push(`Spec validation after schema change:\n${tail(v.output)}`);
} else if (isSpec) {
  const v = run('npm', ['run', '-s', 'spec:validate', '--', path]);
  if (!v.ok) problems.push(`Spec validation:\n${tail(v.output)}`);
}

if (problems.length)
  block(
    `Checks failed after editing ${path}. Fix these before continuing:\n\n${problems.join('\n\n')}`,
  );
