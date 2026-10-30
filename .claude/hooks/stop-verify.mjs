// Stop / SubagentStop: Claude cannot call a task done while the fast verification suite fails.
// (Browser render + screenshot tests are slower; the verifier agent and /verify run those.)
import { block, readInput, run, tail } from './lib.mjs';

const input = await readInput();
// Already continuing because of this hook: don't loop forever. Claude will still see failures
// from post-edit checks, and /verify reports them explicitly.
if (input.stop_hook_active) process.exit(0);

// Skip when nothing changed (pure conversation turns).
const status = run('git', [
  'status',
  '--porcelain',
  '--',
  'src',
  'dashboards',
  'scripts',
  'tests',
  'public',
]);
if (status.ok && status.output === '') process.exit(0);

const verify = run('npm', ['run', '-s', 'verify']);
if (!verify.ok)
  block(
    `\`npm run verify\` is failing, so the task is not done yet. Fix the cause (do not weaken tests or the schema to make it pass):\n\n${tail(verify.output, 60)}`,
  );
