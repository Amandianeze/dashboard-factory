# Dashboard Factory

Spec-first dashboards. Every dashboard is a YAML spec in `dashboards/` validated by a Zod schema;
the React app renders specs with Vega-Lite, Flint, D3 or Plotly. **The spec is the source of truth.**
Never build a dashboard by hand-writing a page; write or change its spec.

## Commands

| Command                                   | What it does                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                             | Vite dev server (index lists every dashboard; `#/d/<id>` opens one)            |
| `npm run verify`                          | typecheck, lint, no-raw-values, tokens, specs, unit tests ("done")             |
| `npm run spec:validate [-- file]`         | Schema, cross-refs, catalog props, fixture fields, VL + Flint checks           |
| `npm run test:e2e`                        | Builds, renders every dashboard in Chromium, per-panel screenshots             |
| `npm run new:dashboard -- <id> "<Title>"` | Scaffold a new spec (always use this; never start from a blank)                |
| `npm run spec:schema`                     | Regenerate `dashboards/dashboard.schema.json` after schema changes             |
| `npm run catalog:build [-- --check]`      | LLD front matter → `catalog.json`, panel `kind` enum, taxonomy tables          |
| `npm run lld:check`                       | LLD front matter (tokens, files, ADRs) and template sections, all items        |
| `npm run registry:build [-- --check]`     | Catalog → `registry/registry.json` → `shadcn build` → `public/r/` (`@factory`) |
| `npm run storybook` / `storybook:build`   | Storybook 10 on :6006 (MCP at `/mcp`) / static build in `storybook-static/`    |
| `npm run test:stories`                    | Every story as a browser test: renders, play function, axe (in `verify`)       |
| `npm run data:fixtures`                   | Regenerate deterministic fixture data in `public/data/`                        |
| `npm run data:profile`                    | Check every fixture row against declared field types; stats                    |
| `npm run panel:render -- <dash> <panel>`  | Render one panel in Chromium: screenshot, console, compiled VL spec            |
| `npm run tokens:build [-- --check]`       | DTCG `tokens/` → `src/theme/generated/` (CSS vars, themes, engines)            |
| `npm run tokens:validate`                 | Contrast, CVD separability, ramps, references; writes contrast matrix          |
| `npm run lint:no-raw-values`              | Fail on colours/lengths outside `src/theme/` (`raw-ok:` to justify)            |
| `npm run design:build` / `design:check`   | DESIGN.md front matter from tokens / fresh + DTCG round-trip                   |
| `npm run design:lint` / `design:diff`     | @google/design.md lint + section order / regressions vs `master`               |
| `npm run design:taste -- "Do …"`          | Add a reviewed rule to Do's and Don'ts on a taste/* branch, for a PR           |

## Architecture

    dashboards/*.dashboard.yaml   ← specs (source of truth)
    src/spec/schema.ts            ← Zod schema + cross-reference checks (the contract)
    src/spec/validate.ts          ← schema + D3 chart props validation, YAML parsing
    docs/lld/<id>.md              ← catalog items: front matter is the contract; body per _template.md
    docs/lld/<id>.props.ts        ← the item's props interface (components import it)
    docs/adr/                     ← ADR-001 tokens · 002 chart layer · 003 primitives/icons · 004 distribution · 005 versioning
    catalog.json                  ← generated: every catalog item (agents read this before building)
    src/components/{ui,panels}/   ← catalog components (Base UI + cva; Tailwind utilities over token vars)
    src/stories/<level>/<id>.stories.tsx ← one story file per built item (CSF Factories); coverage-checked
    registry/registry.json        ← generated @factory shadcn registry; public/r/ is its build (CI → Pages)
    docs/taxonomy.md              ← UI ladder × BI ladder, panel kinds, gap and deprecation lists
    src/components/d3/charts.ts   ← D3 chart contracts (props schema, field props), no React
    src/components/d3/registry.tsx← chart name → React component (TS enforces completeness)
    src/renderers/                ← PanelRenderer switch; one adapter per renderer
    DESIGN.md                     ← design contract: generated front matter + curated prose
    tokens/**/*.tokens.json       ← design tokens (DTCG): primitive → semantic → component (ADR-001)
    scripts/tokens/               ← resolver, validators, build, engine adapters (VL/Flint/Plotly)
    src/theme/generated/          ← generated: tokens.css, themes.ts, engines.ts (never edit)
    src/theme/ThemeProvider.tsx   ← active theme/density (?theme=dark|hc, system preference)
    src/data/transforms.ts        ← pure filter/aggregate helpers (unit-tested)
    scripts/                      ← deterministic codegen + validation (no model judgment)

## Choosing a renderer (in this order)

1. **kpi** for single numbers (`comparison` adds the change against another field); **table** for
   exact values people look up.
2. **vega-lite** for anything the grammar expresses: line, bar, area, scatter, heatmap, faceting.
   Default choice. Specs omit `data`, `width`, `height`; the runtime injects them.
3. **flint** for forms in Flint's chart catalog that are long or fiddly in Vega-Lite (calendar
   heatmap, bullet, waterfall, bump, slope, ridgeline, …). Compiles to Vega-Lite; formats come
   from the dataset's `semantics`. Read the `flint` skill's known limits first.
4. **d3** only for bespoke visuals Vega-Lite and Flint can't express. Must be a catalog component.
   Adding one = catalog entry (propsSchema + fieldProps) + component + registry entry + test.
5. **plotly** only for scientific/interactive needs (zoom/pan on dense scatter). Limited to the
   basic bundle (`scatter`, `bar`); asking for more trace types is an architecture decision.

## Rules

- Read `DESIGN.md` before any UI or chart work; it is the design contract (values, rationale,
  Do's and Don'ts). Its front matter is generated: change `tokens/`, then `npm run design:build`.
  Do's and Don'ts change only via `npm run design:taste` and a PR (a hook blocks direct edits).
- Look before you build: check `catalog.json` before creating any component or panel type. A
  panel's `kind` must be a built organism there; a new item needs an LLD and an approval gate.
- Components style with Tailwind utilities that reference token variables only
  (`bg-(--button-primary-bg)`, `[font:var(--x-typography-font)]`); Tailwind's default theme is not
  loaded, so `p-3`, `text-sm` and even `m-0` or `top-0` generate nothing (write `m-[0]`, `top-[0]`). Put `tabular-nums!` (important) next to a font
  shorthand: the shorthand resets `font-variant-numeric`.
- A built catalog item needs an LLD, a story and a registry entry; `catalog:build` fails otherwise.
- Every field a panel references must be declared in its dataset's `fields`. Validation enforces it.
- Quote every d3-format string in YAML (`format: '$,.0f'`): commas split flow mappings.
- Prefer block-style YAML for nested Vega-Lite specs; Prettier mangles long flow mappings.
- No hard-coded colors, fonts or spacing outside `src/theme/`. Use CSS variables from
  `src/theme/generated/tokens.css` or `useTheme().tokens`; add a token in `tokens/` if one is
  missing. Semantic and component tokens only reference other tokens; a rebrand edits primitives.
- D3 pattern: React renders the SVG; D3 only computes (scales, formats, layouts). No `d3.select`
  DOM mutation inside React components.
- Keep `src/data/transforms.ts` and `*Figure.ts` / `*Spec.ts` builders pure and unit-tested.
- Never edit generated files (`dashboard.schema.json`, `public/data/*`, `src/theme/generated/*`,
  `catalog.json`, `src/spec/generated/*`, `registry/registry.json`, `public/r/*`, `public/favicon.svg`, `docs/tokens/contrast-matrix.md`,
  screenshot baselines, `dist/`).
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
- Skills (`.claude/skills/`): `dashboard-spec`, `vega-lite`, `flint`, `d3-react`, `plotly` (how to write);
  `chart-choice` (what to build); `debug-panel`, `visual-baselines` (when it breaks);
  `datasets-and-fixtures`, `render-performance` (data); `harness-maintenance` (changing `.claude/`).
- Commands: `/new-dashboard <brief>`, `/add-panel <dashboard-id> <what>`, `/verify`, `/catalog [need]`.
- MCP (`.mcp.json`): Playwright (look at the running app), Context7 (current library docs),
  shadcn (search and add `@factory` registry items), Storybook (components and stories, needs
  `npm run storybook`).

## Roadmap (not built yet)

- Design system (in progress, `docs/inventory/gate-0.md`, `docs/tokens/gate-1.md`): DESIGN.md,
  catalog + LLDs, Storybook, shadcn registry. Cross-panel interactions (brush → filter).
- Phase 3: semantic layer + typed API; `source: api` datasets; metric catalog exposed over MCP.
- Phase 4: headless factory runs (`claude -p`) in CI from committed briefs.
