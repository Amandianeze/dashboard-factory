/**
 * Validate dashboard specs. Used by the PostToolUse hook, the Stop hook and CI.
 * Usage: npm run spec:validate [-- path/to/one.dashboard.yaml ...]
 * Exit code 1 with readable errors on failure.
 */
import { relative, resolve } from 'node:path';
import { checkSpecFile, listSpecFiles, ROOT } from './lib/specs';

const args = process.argv.slice(2);
const files = args.length ? args.map((a) => resolve(a)) : listSpecFiles();

let failed = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  const { errors } = checkSpecFile(file);
  if (errors.length) {
    failed++;
    console.error(`✗ ${rel}`);
    for (const e of errors) console.error(`    ${e}`);
  } else console.log(`✓ ${rel}`);
}
if (!files.length) console.log('no dashboard specs found');
process.exit(failed ? 1 : 0);
