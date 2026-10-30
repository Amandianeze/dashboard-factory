// PreToolUse (Edit|MultiEdit|Write): block edits to generated or vendored files and point Claude
// at the source of truth instead.
import { block, readInput, rel } from './lib.mjs';

const RULES = [
  [/^node_modules\//, 'node_modules is managed by npm.'],
  [/^dist\//, 'dist/ is build output; run `npm run build`.'],
  [/^package-lock\.json$/, 'package-lock.json is managed by npm; run `npm install <pkg>`.'],
  [
    /^dashboards\/dashboard\.schema\.json$/,
    'Generated from src/spec/schema.ts; edit the Zod schema then run `npm run spec:schema`.',
  ],
  [
    /^public\/data\//,
    'Fixtures are generated; edit scripts/generate-fixtures.ts then run `npm run data:fixtures`.',
  ],
  [
    /-snapshots\//,
    'Screenshot baselines change only via `npm run test:e2e -- --update-snapshots` after a reviewed visual change.',
  ],
  [/^\.env/, 'Never write secrets files.'],
];

const input = await readInput();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);
const path = rel(file);
for (const [pattern, reason] of RULES)
  if (pattern.test(path)) block(`Blocked edit to ${path}: ${reason}`);
