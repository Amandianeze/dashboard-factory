---
name: render-performance
description: Data-volume and rendering budgets for each renderer, and how to keep filter changes and large datasets fast (pre-aggregation, avoiding O(n²) grouping, not re-embedding Vega). Use when a dataset exceeds a few thousand rows, a filter feels slow, or before wiring up a real data source.
---

# Render performance

Fixtures are ~2k rows, which hides cost. Check budgets before real data arrives.

## Rough budgets (rows reaching the renderer after filters)

| Renderer    | Comfortable | Action above that                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------------------- |
| `kpi`       | 100k+       | Fine; it is one reduce                                                              |
| `vega-lite` | ~5k         | Pre-aggregate (`groupAggregate`) or add `transform: aggregate`; avoid raw-row marks |
| `d3`        | ~5k         | Aggregate in the component's `useMemo`; SVG nodes ≈ rows, keep top-N                |
| `plotly`    | ~2k         | Basic bundle has no `scattergl`; dense scatter needs an architecture decision       |

`npm run data:profile` prints row counts against the 5,000 budget. Measure before optimizing:
`npm run build` reports chunk sizes; Vega and Plotly are lazy chunks and must stay out of the main bundle.

## Known hot spots in this repo

- **Filter change re-embeds every Vega panel.** `DashboardView` builds new row arrays for all panels,
  `buildVegaLiteSpec` makes a new spec, and `VegaLiteChart` tears down and rebuilds the view. A
  fix is to embed once and push new rows through the Vega view (`view.change('source_0', …)` or a
  named data source) instead. Do this only with a test or timing evidence.
- **Filters only change panels they apply to.** Memoize per panel so unaffected panels keep the
  same `rows` reference (reference equality is what prevents the re-embed).
- **`plotlyFigure.ts` grouping** builds a new array per row (`[...(groups.get(k) ?? []), r]`);
  use `push` for linear time.
- **Whole-project `tsc` on every edit** (`post-edit` hook) will dominate as the repo grows.

## Rules of thumb

- Aggregate once, as early as possible, in a pure unit-tested function in `src/data/transforms.ts`.
- Keep `useMemo` dependencies stable (do not create arrays/objects inline as deps).
- Never read or write the DOM in a render path for D3 components; compute in `useMemo`.
- Don't ship rows the panel won't draw: a ranked top-10 needs aggregates, not 100k rows.
- For `source: api` (Phase 3), push aggregation to the server and cache by dataset + filter state.

## Verifying a fix

1. Reproduce with `npm run panel:render` or a larger generated fixture (see `datasets-and-fixtures`).
2. Measure (Performance panel via the Playwright MCP, or `performance.now()` around the change).
3. `npm run verify`; add a unit test for any new pure helper.
