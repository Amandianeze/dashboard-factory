# Gate 5: component catalog (registry, Storybook, catalog.json)

**Status:** ready for review, 2026-11-21. Branch `design-system/phase-5` (from `design-system/phase-4`).
Scope chosen before the phase: the 13 built items plus the 7 P1 gaps, built now (20 items); publish
to GitHub Pages.

## What was produced

- **7 new components:**
  - Button, Badge, Tooltip (Base UI), DeltaIndicator, EmptyState, KpiValue and DataTable.
  - FormattedValue, Select, FilterChip, TitleBand, PanelFrame and NavCard were extracted from
    inline markup.
  - All 20 are `beta`: built, with an LLD, a story and a registry entry.
- **New spec options:**
  - KPI `comparison` (field-based `compareTo`, Gate 4).
  - The `table` renderer (`kind: data-table`), with sorting, number formats, a `sign` conditional,
    status badges, and "Show all" after `limit`.
- **Storybook 10** with CSF Factories:
  - 20 story files with 86 stories: states and break-ui cases (10⁹, zero rows, 10k rows, RTL,
    missing data, narrow cells).
  - Toolbar globals for theme, density, host and motion drive the real `ThemeProvider`.
  - `npm run test:stories` runs every story in Chromium with its play function and axe in error
    mode. It's part of `verify` and takes about 12 s.
- **`@factory` registry:**
  - `npm run registry:build` generates `registry/registry.json` from the catalog and runs
    `shadcn build` into `public/r/`: 21 items, the 20 components plus `@factory/theme`.
  - Each item ships the closure of its relative imports under `factory/`, with repo paths kept, so
    imports resolve without rewriting.
  - npm and `@types` dependencies come from the import graph at the versions pinned in
    `package.json`.
- **`catalog.json` coverage:** each item records its LLD, story (file, title, URL) and registry entry
  (name, URL). `catalog:build` fails if a built item lacks a story or registry entry.
- **Agent lookup:**
  - `/catalog` command.
  - shadcn MCP (`components.json` with the `@factory` namespace).
  - Storybook MCP (`@storybook/addon-mcp`, at `/mcp` while `npm run storybook` runs).
  - `catalog.json` published next to the registry.
- **Publishing:** `.github/workflows/pages.yml` builds the registry and Storybook on pushes to
  `master` and deploys them to `https://amandianeze.github.io/dashboard-factory/` (registry at `/r/`,
  catalog at `/catalog.json`).
- **Tailwind v4, utilities only** (ADR-003, amended):
  - No default theme and no preflight.
  - Components reference token variables directly: `bg-(--button-primary-bg)`.
  - Default-scale classes (`p-3`) generate nothing, so tokens stay the only source of values.

## Checks

| Check                                                      | Result                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run verify`                                           | ✓ green: 92 unit tests, 86 story tests (axe + play), all generators fresh |
| Catalog coverage (built items with LLD + story + registry) | ✓ 20 / 20                                                                 |
| Story URLs in `catalog.json` exist in the built Storybook  | ✓ 20 / 20                                                                 |
| `npx shadcn add @factory/kpi-card` into a fresh Vite app   | ✓ installed from a local registry server                                  |
| Same app with chart-panel, data-table, button (43 files)   | ✓ typechecks under TypeScript 7 strict; `vite build` succeeds             |
| Installed KPI card renders                                 | ✓ token colours, tabular numerals, screen-reader text                     |
| `tokens:validate`                                          | ✓ 195 contrast pairs (new component tokens included)                      |
| `test:e2e`                                                 | intended diffs only; see below                                            |

**Bugs found by the new checks and fixed in this phase:**

1. **tabular-nums lost under the `font` shorthand:** KPI values went proportional. Found by
   comparing Phase 4 and Phase 5 renders; now byte-identical to Phase 4.
2. **Badge status text failed contrast** (dark info 3.22:1; high-contrast warning 5.43:1 against
   7:1). Badges now use neutral text with a status dot.
3. **Duplicate landmark names:** the data table's scroll region had the same name as its panel
   (axe).
4. **Missing type packages for consumers:** registry items didn't ship `@types/d3`, the Plotly
   ambient types or `vega-lite`'s types. Found by the TypeScript 7 install test.

## Visual changes (review the screenshots)

- **sp500-today:** close, change, change % and previous close (four tiles) are now one card,
  "7,720.39 ▼ −23.59 ▼ −0.30% vs previous close 7,743.98", plus day high and low (deprecation 8).
- **Panels with a description** show a focusable ⓘ button with a Tooltip instead of `title=`.
- **Clear** in the filter bar is a ghost Button. Empty or filtered charts show EmptyState, not
  empty axes.
- **Index cards** look the same, with a hover border.
- **The local macOS baselines are stale** (31 October, before Phase 1): `revenue_total` fails
  against them although it's byte-identical to Phase 4. The Linux baselines are still pending
  (Docker), so no baselines were updated.

## Not done / deferred

- **Not published yet.** The workflow deploys only from `master`, and the `github-pages`
  environment only accepts the default branch. Nothing is on `master` yet: `design-system/phase-2` has no PR into it. Pages also has to
  be enabled for GitHub Actions in the repo settings (or via the API, with your OK).
- **Chart text alternatives and the data-table fallback for charts:** DataTable exists, but charts
  don't offer it yet. This is still the largest accessibility gap, and the brief's chart stories
  ask for it.
- **Stories run in light theme only** in CI. Dark and high-contrast are in the toolbar. A second
  Vitest project pinned to `dark` would double the run time.
- **Code Connect:** deferred (no Figma file, Gate 0).
- **`registry:base`:** ADR-004 wanted the Base UI pin, but the docs don't show which config key
  sets it, so it isn't built. Consumers' `components.json` keeps shadcn's default, which is
  Base UI.
- **DESIGN.md Components** doesn't list the 7 new components yet: the front matter maps tokens
  only for the original set, and the prose needs entries.

## Questions for you

1. **Enable GitHub Pages now?** It's a repo setting ("Build and deployment → Source: GitHub
   Actions"). I can set it with `gh api` if you say so. Nothing deploys until `master` has the
   workflow.
2. **Getting to `master`:** the branches stack as `taste/*` (#1) → `design-system/phase-2` →
   `master`, with #2 (phase 3) → #3 (phase 4) → #4 (phase 5) on top. `phase-2` has no PR into `master`
   yet. Shall I open one, so you can merge #1, then phase 2, then #2–#4 in order?
3. **Next:** Phase 6 (motion and polish) as planned, or the chart text alternatives and data-table
   fallback first (the largest open accessibility item)?
