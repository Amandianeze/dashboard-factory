# Gate 5a: chart text alternatives and the table fallback

**Status:** ready for review, 2026-11-22. Branch `design-system/chart-text-alternatives` (from
`design-system/phase-5`). Chosen at Gate 5 to come before Phase 6.

## What was produced

- **Summary:** every chart is one `img`, named by its title and described by the panel description
  plus a generated sentence: how many points, each measure's range, and where the extremes are.
- **Table view:** a **Table** button in every chart's header swaps in the data-table organism. It
  lists what the chart plots (68 weekly sums for the trend, not 1,904 source rows), with exact
  values, and follows the filters.
- **All four engines:** Vega-Lite and Flint read the compiled view, Plotly its figure, D3 a now
  required `chartData` in the chart registry.
- **No spec change and no new runtime dependency.** Existing dashboards get both automatically.

## Checks

| Check                                                                              | Result                                                      |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `npm run verify`                                                                   | ✓ 113 unit tests, 90 story tests                            |
| Table values against fixture totals, all 5 dashboard charts                        | ✓                                                           |
| Date formatting in 4 timezones                                                     | ✓                                                           |
| `test:e2e --ignore-snapshots`                                                      | ✓ 10 / 10, including keyboard use and filter follow-through |
| axe on both dashboards: 3 themes, 2 widths, 2 densities, chart and table (48 runs) | ✓ no violations                                             |
| Layout in the same 48 runs                                                         | 8 fail on one existing bug, below                           |
| Pixels against Phase 5                                                             | ✓ only the Table button differs on chart panels             |
| Initial JS (gzip)                                                                  | +1.7 kB (budget 2 kB); the Vega reader is a lazy 2 kB chunk |
| 10,000 points: rows plus summary                                                   | ✓ 1.7 ms (budget 50 ms)                                     |
| `shadcn add @factory/chart-panel` into a fresh Vite app                            | ✓ typechecks                                                |

## Limits and open items

- **Not tested with a screen reader.** The checks read the accessibility tree and run axe.
- **The summary gives ranges, not the takeaway.** It can't say "West leads every week".
- **Labels are field names** unless the spec sets a title ("sum of revenue", "orders").
- **Fallback:** concat and repeat charts list source rows, and the summary says so. No dashboard
  uses them today.
- **Screen readers no longer step through individual marks;** the table replaces that.
- **Existing bug:** at 390 px the Flint heatmap is 5 px wider than the screen (same on Phase 4).
- **Screenshot baselines were not updated:** Linux baselines still need Docker.

## Questions for you

1. Is the generated range summary enough, or should specs get an optional authored `takeaway`
   (a schema change)? Recommended: keep it generated until a real dashboard needs more.
2. Confirm the ADR-003 and ADR-004 amendments proposed in Phase 5?
3. Go on to Phase 6 (motion and polish)? The heatmap overflow fits there.
