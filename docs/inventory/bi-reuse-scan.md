# BI reuse scan (Phase 0, SQLBI ladder)

What recurs across the 2 dashboards, placed on the SQLBI ladder (objects → patterns → visuals →
page templates → report templates). There are no Power BI templates in the repo yet (`templates/`
doesn't exist), so this scan covers YAML specs only. With 2 dashboards the counts are small. Treat
the ranking as the order in which to build reusable parts, not as statistics.

## Ranked by recurrence

| Rank | Level         | Item                                                          | Recurs            | Where                                                                          | What to build                                                                                                                   |
| ---- | ------------- | ------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | visual        | **KPI tile** (value + label)                                  | 9                 | 3 in revenue, 6 in sp500                                                       | KPI card organism with value, delta, sign colour, target and sparkline slots                                                    |
| 2    | object        | **Formatted currency value** (revenue)                        | 5 uses, 4 formats | KPI `$,.0f`, VL axis `$~s`, VL tooltip `$,.0f`, D3 `$.3~s`, Flint `Amount/USD` | `format.currency` / `format.currency-compact` tokens + one `@factory/format` module that VL, Flint, D3, Plotly and KPI all call |
| 3    | object        | **Fixed-precision index level** `,.2f`                        | 4                 | sp500 close, previous close, high, low                                         | `format.decimal-2` token; a dataset-level `format` on the field so panels stop repeating it                                     |
| 4    | object        | **"The value" of a one-row dataset** (`aggregate: max`/`min`) | 6                 | all sp500 KPIs                                                                 | a `last` / `value` aggregate (or `row: latest`), so `max` stops standing in for selection                                       |
| 5    | pattern       | **Period comparison** (current vs previous, absolute and %)   | 1 set (3 KPIs)    | sp500 change, change %, previous close                                         | a period-comparison pattern: one KPI with `compareTo`, delta and delta % (signed formats `+,.2f` / `+.2%`)                      |
| 6    | page template | **KPI band → primary chart → supporting charts**              | 2                 | both dashboards; codified in the `chart-choice` skill                          | `DashboardTemplate` with named regions (kpis, primary, supporting)                                                              |
| 7    | object        | **Sum of a measure by category** (`sum(revenue)`)             | 4                 | KPI, VL trend, RankedBars, Flint heatmap                                       | a measure catalog entry (`revenue = sum(revenue)`, format, unit): Phase 3 semantic layer, record now                            |
| 8    | pattern       | **Title band** (h1 + description)                             | 2                 | every dashboard                                                                | an atom/molecule; already consistent                                                                                            |
| 9    | pattern       | **Slicer** (multiselect chips over a nominal field)           | 1                 | revenue region                                                                 | FilterChip group molecule; Select molecule                                                                                      |
| 10   | visual        | **Ranked bars (top-N)**                                       | 1                 | revenue by product                                                             | already a D3 catalog item; reuse, don't re-implement in VL                                                                      |
| 11   | visual        | Time-series line, scatter, heatmap, candlestick               | 1 each            | —                                                                              | no recurrence yet; keep them as chart-panel stories, don't make bespoke organisms                                               |

## Observations

- The **signed format** (`+,.2f`, `+.2%`) is the only place sign semantics exist, and it's text only.
  There is no `color.data.positive/negative`, so the "Change" KPI can't be coloured from tokens.
- **Units live in titles** ("Change (points)", "Change (%)"). A unit-label object would remove that duplication.
- Flint `semantics` (`Amount` + `USD`) is already a measure-level format declaration. That's the
  better model, and the d3-format strings in panels duplicate it. ADR-002 should decide whether
  dataset `semantics` becomes the single format source for all renderers.
- Highest payback, as SQLBI predicts: objects (formats, the `last` aggregate) and the KPI visual.
  They account for 9 of 14 panels.
