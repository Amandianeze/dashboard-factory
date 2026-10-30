# Dashboard Factory

Spec-first dashboards. Every dashboard is a YAML spec in `dashboards/` validated by a Zod schema;
the React app renders specs with Vega-Lite, D3 or Plotly. **The spec is the source of truth.**
Never build a dashboard by hand-writing a page; write or change its spec.

## Commands

| Command                                   | What it does                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                             | Vite dev server (index lists every dashboard; `#/d/<id>` opens one) |
| `npm run verify`                          | typecheck + lint + spec validation + unit tests (the "done" gate)   |
| `npm run spec:validate [-- file]`         | Schema, cross-refs, catalog props, fixture fields, VL compile       |
| `npm run test:e2e`                        | Builds, renders every dashboard in Chromium, per-panel screenshots  |
| `npm run new:dashboard -- <id> "<Title>"` | Scaffold a new spec (always use this; never start from a blank)     |
| `npm run spec:schema`                     | Regenerate `dashboards/dashboard.schema.json` after schema changes  |
| `npm run data:fixtures`                   | Regenerate deterministic fixture data in `public/data/`             |

## Architecture

```
dashboards/*.dashboard.yaml   ← specs (source of truth)
src/spec/schema.ts            ← Zod schema + cross-reference checks (the contract)
src/spec/validate.ts          ← schema + D3 catalog validation, YAML parsing
src/components/d3/catalog.ts  ← D3 chart contracts (props schema, field props), no React
src/components/d3/registry.tsx← catalog name → React component (TS enforces completeness)
src/renderers/                ← PanelRenderer switch; one adapter per renderer
src/theme/tokens.ts           ← design tokens; every renderer derives its look from here
src/data/transforms.ts        ← pure filter/aggregate helpers (unit-tested)
scripts/                      ← deterministic codegen + validation (no model judgment)
```

## Choosing a renderer (in this order)

1. **kpi** for single numbers.
2. **vega-lite** for anything the grammar expresses: line, bar, area, scatter, heatmap, faceting.
   Default choice. Specs omit `data`, `width`, `height`; the runtime injects them.
3. **d3** only for bespoke visuals Vega-Lite can't express. Must be a catalog component.
   Adding one = catalog entry (propsSchema + fieldProps) + component + registry entry + test.
4. **plotly** only for scientific/interactive needs (zoom/pan on dense scatter). Limited to the
   basic bundle (`scatter`, `bar`); asking for more trace types is an architecture decision.

## Rules

- Every field a panel references must be declared in its dataset's `fields`. Validation enforces it.
- Quote every d3-format string in YAML (`format: '$,.0f'`): commas split flow mappings.
- Prefer block-style YAML for nested Vega-Lite specs; Prettier mangles long flow mappings.
- No hard-coded colors, fonts or spacing outside `src/theme/`. Use tokens / CSS variables.
- D3 pattern: React renders the SVG; D3 only computes (scales, formats, layouts). No `d3.select`
  DOM mutation inside React components.
- Keep `src/data/transforms.ts` and `*Figure.ts` / `*Spec.ts` builders pure and unit-tested.
- Never edit generated files (`dashboard.schema.json`, `public/data/*`, screenshot baselines, `dist/`).
  A hook blocks it and names the right command.
- Never weaken a test, the schema, or a validation rule to make checks pass. Fix the cause.
- A task is done when `npm run verify` passes. For visual changes also run `npm run test:e2e`
  and look at the panel screenshots; update baselines only for intended changes.

## Harness

- Hooks (`.claude/settings.json`): edits are formatted, linted, type-checked and spec-validated
  immediately; finishing is blocked while `npm run verify` fails; generated paths are write-protected.
- Subagents (`.claude/agents/`): `spec-author` (brief → spec), `chart-builder` (implements panels
  and D3 components), `design-reviewer` (chart choice, tokens, layout), `verifier` (runs everything,
  inspects screenshots, reports).
- Skills (`.claude/skills/`): `dashboard-spec`, `vega-lite`, `d3-react`, `plotly`.
- Commands: `/new-dashboard <brief>`, `/add-panel <dashboard-id> <what>`, `/verify`.
- MCP (`.mcp.json`): Playwright (look at the running app), Context7 (current library docs).

## Roadmap (not built yet)

- Phase 2: DTCG design tokens → Style Dictionary → CSS vars, Vega-Lite config, Plotly template;
  chart-grammar rules enforced by design-reviewer; cross-panel interactions (brush → filter).
- Phase 3: semantic layer + typed API; `source: api` datasets; metric catalog exposed over MCP.
- Phase 4: headless factory runs (`claude -p`) in CI from committed briefs.
