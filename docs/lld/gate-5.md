# Gate 5: component catalog (registry, Storybook, catalog.json)

**Status:** reviewed 2026-11-22 (decisions at the end; corrections below). Branch `design-system/phase-5` (from `design-system/phase-4`).
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
- **Tailwind v4, utilities only** (ADR-003, amendment proposed):
  - No default theme and no preflight.
  - Components reference token variables directly: `bg-(--button-primary-bg)`.
  - Default-scale classes (`p-3`) generate nothing, so tokens stay the only source of values.

## Checks

| Check                                                      | Result                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run verify` (2026-11-22, after the corrections)       | ✓ 93 unit tests, 86 story tests, all generators fresh         |
| Catalog coverage (built items with LLD + story + registry) | ✓ 20 / 20                                                     |
| Story URLs in `catalog.json` exist in the built Storybook  | ✓ 20 / 20                                                     |
| `npx shadcn add @factory/kpi-card` into a fresh Vite app   | ✓ installed from a local registry server                      |
| Same app with chart-panel, data-table, button (43 files)   | ✓ typechecks under TypeScript 7 strict; `vite build` succeeds |
| Installed KPI card renders                                 | ✓ token colours, tabular numerals, screen-reader text         |
| `tokens:validate`                                          | ✓ 195 contrast pairs (new component tokens included)          |
| `test:e2e --ignore-snapshots`                              | ✓ 7 / 7: every panel draws in 3 themes, no console errors     |
| Every panel against a Phase 4 build (1440 and 390 px)      | ✓ only the changes listed below                               |

**Bugs found by the new checks and fixed in this phase:**

1. **tabular-nums lost under the `font` shorthand:** KPI values went proportional. Found by
   comparing Phase 4 and Phase 5 renders; the three revenue KPI tiles are pixel-identical to Phase 4.
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
- **Index cards** are pixel-identical at 1440 px. At 390 px they now fit the screen (in Phase 4
  they were 456 px wide and overflowed).
- **At 390 px** a long title wraps beside its ⓘ button, so that plot moves down a line.
- **The local macOS baselines are stale** (31 October, before Phase 1): `revenue_total` fails
  against them although it's pixel-identical to Phase 4. The snapshot run stops at each dashboard's
  first failing panel, so it was not evidence about the others; the Phase 4 comparison is. The Linux baselines are still pending
  (Docker), so no baselines were updated.

## Corrections, 2026-11-22

The first version of this report claimed more than had been checked. It said the index looked the
same, that the visual diffs were intended only, and that verify was green at 92 tests; none of the
three had been checked. Checking found, and this branch now fixes:

1. **Three utilities compiled to nothing** (`m-0`, `min-h-0`, `top-0`). The data table had no
   sticky header and no bounded scroll region. A unit test now fails on such classes.
2. **Index cards were 340 px instead of full width**, with extra space above each title.
3. **The ⓘ button made panel headers taller** and shrank three plots. It was also 22.8 px wide in
   compact density, under the 24 px target minimum.
4. **The KPI with a comparison sat higher than its neighbours.**
5. **`dashboard.schema.json` was stale** (no table, no comparison). `verify` now checks it.
6. **`ChartPanelSpec` included tables**, and the browser tests expected an svg inside a table.
7. **ADR-003 was described as amended and wasn't.** Amendments to ADR-003 and ADR-004 are now
   written and await confirmation.

The fresh-app install test predates these fixes and covered 4 of the 20 items.

## Not done / deferred

- **Not published yet.** Pages is enabled (source: GitHub Actions, 2026-11-22). It deploys when
  the workflow reaches `master`.
- **Chart text alternatives and the data-table fallback for charts:** DataTable exists, but charts
  don't offer it yet. This is still the largest accessibility gap, and the brief's chart stories
  ask for it.
- **Stories run in light theme only** in CI. Dark and high-contrast are in the toolbar. A second
  Vitest project pinned to `dark` would double the run time.
- **Code Connect:** deferred (no Figma file, Gate 0).
- **`registry:base`:** ADR-004 wanted the Base UI pin, but the docs don't show which config key
  sets it, so it isn't built. Consumers' `components.json` keeps shadcn's default, which is
  Base UI.
- **`npm audit` (2026-11-22):** 17 findings (2 high, 15 moderate). The one in production
  dependencies is high: Zod < 4.6.6 can exhaust memory validating oversized collections. Specs are
  committed files, so exposure is low today; the fix is a breaking move to Zod 4.
- **DESIGN.md Components** doesn't list the 7 new components yet: the front matter maps tokens
  only for the original set, and the prose needs entries.

## Decisions (owner, 2026-11-22)

1. **GitHub Pages:** enable it. Done.
2. **Getting to `master`:** open the phase-2 PR. Done (#4; it lists the merge order).
3. **Next:** chart text alternatives and the data-table fallback, before Phase 6.
