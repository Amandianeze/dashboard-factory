# Dashboard Factory

Spec-first dashboards with React, TypeScript, Vite, Vega-Lite, D3 and Plotly, built to be driven
by Claude Code. Phase 1 of the harness/software-factory design.

## Quick start

```bash
npm install
npx playwright install chromium   # once, for browser render tests
npm run dev                        # http://localhost:5173 → open "Revenue overview"
npm run verify                     # typecheck + lint + spec validation + unit tests
npm run test:e2e                   # build, render every dashboard, per-panel screenshot diffs
```

Screenshot baselines are per-OS (`*-chromium-linux.png` ships with the repo for Linux CI). On
macOS, run `npm run test:e2e -- --update-snapshots` once to create `*-darwin.png` baselines.

## How it works

1. A dashboard is a YAML file in `dashboards/` (see `revenue-overview.dashboard.yaml`).
2. `src/spec/schema.ts` (Zod) validates it, including cross-references: panels exist and are
   placed, every referenced field is declared, filters target panels on the same dataset, D3 props
   match the component catalog, format strings are valid.
3. `npm run spec:validate` also checks fixture data has the declared fields and compiles every
   Vega-Lite panel.
4. The app bundles every spec, validates it at load, and renders each panel through
   `PanelRenderer` (kpi / vega-lite / d3 / plotly). Vega and Plotly are lazy-loaded chunks.
5. All styling derives from `src/theme/tokens.ts`.

## Using it with Claude Code

Open the folder in Claude Code. `CLAUDE.md` explains the architecture and rules; the harness lives
in `.claude/`:

| Piece                                        | What it does                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `hooks/guard-paths.mjs` (PreToolUse)         | Blocks edits to generated files and names the right command                                 |
| `hooks/post-edit.mjs` (PostToolUse)          | Prettier, ESLint, `tsc`, spec validation on every edit; failures go straight back to Claude |
| `hooks/stop-verify.mjs` (Stop, SubagentStop) | Claude can't finish while `npm run verify` fails                                            |
| `agents/spec-author.md`                      | Brief → validated spec                                                                      |
| `agents/chart-builder.md`                    | New D3 catalog components, renderer/schema changes                                          |
| `agents/design-reviewer.md`                  | Chart choice, layout, formatting, honesty review from screenshots                           |
| `agents/verifier.md`                         | Independent PASS/FAIL with screenshot evidence                                              |
| `skills/`                                    | `dashboard-spec`, `vega-lite`, `d3-react`, `plotly` reference                               |
| `commands/`                                  | `/new-dashboard <brief>`, `/add-panel <id> <what>`, `/verify`                               |
| `.mcp.json`                                  | Playwright MCP (look at the running app) and Context7 (current library docs)                |

Try: `/new-dashboard A product-mix dashboard for the merchandising team: which products drive
revenue in each region, and how has the mix shifted week over week?`

## Next phases

- **2 — Design language:** DTCG tokens → Style Dictionary → CSS vars, Vega-Lite config, Plotly
  template; chart-grammar rules; cross-panel interactions.
- **3 — Backend:** semantic layer + typed API, `source: api` datasets, metric catalog over MCP.
- **4 — Factory automation:** headless `claude -p` runs in CI from committed briefs, PR per dashboard.
