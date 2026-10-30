---
description: Build a new dashboard end to end from a brief (spec → components → verify → review)
argument-hint: <brief describing the dashboard, its audience and the questions it answers>
---

Build a new dashboard from this brief:

$ARGUMENTS

Run the factory pipeline:

1. Use the **spec-author** subagent to turn the brief into `dashboards/<id>.dashboard.yaml`.
2. If it reports missing D3 components or renderer capabilities, use the **chart-builder**
   subagent to add them (one call per component; they are independent, so run them in parallel).
3. Run `npm run verify` and fix any failures.
4. Run `npm run test:e2e -- --update-snapshots` to create baselines for the new dashboard only,
   then use the **verifier** subagent to confirm every panel renders correctly.
5. Use the **design-reviewer** subagent. Apply blocker and should-fix findings, then re-verify.
6. Summarize: the spec path, panels and renderers used, anything added to the D3 catalog, review
   findings you applied or deferred, and how to open it (`npm run dev`, then `#/d/<id>`).
