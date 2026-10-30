---
name: flint
description: When and how to write Flint panels (renderer flint) — chart types, dataset semantic types, what the runtime injects, and Flint's known limits in this project. Use when writing or debugging a flint panel or changing src/renderers/flint* or src/theme/flintTheme.ts.
---

# Flint in this project

[Flint](https://github.com/microsoft/flint-chart) (`flint-chart`, pinned exactly in
`package.json`) compiles a short chart spec plus **semantic types** into Vega-Lite. Scales, number
formats, label density and legends come from the semantics, so panels stay short.

Use it after `vega-lite` when Flint's catalog has the form ready-made and raw Vega-Lite would be
long or fiddly: Bullet, Waterfall, Bump, Slope, Ridgeline, Calendar Heatmap, Radar, Candlestick,
Marginal Plot, Regression, Lollipop, Range Area. Plain line/bar/heatmap work too, but Vega-Lite is
still the default for those.

## Panel shape

```yaml
datasets:
  sales:
    fields: { date: temporal, region: nominal, revenue: quantitative }
    semantics: # optional, once per dataset; keys must be declared fields
      date: Date
      region: Region
      revenue: { semanticType: Amount, unit: USD } # unit drives currency formatting

panels:
  heatmap:
    title: Revenue by region and product # the panel header; Flint's own title is dropped
    dataset: sales
    renderer: flint
    chart:
      chartType: Heatmap # a Flint Vega-Lite template name, exact spelling
      encodings:
        x: product # bare field name
        y: region
        color: { field: revenue, aggregate: sum, title: Revenue, bins: 0 }
      chartProperties: {} # optional template options
```

`chart` accepts only `chartType`, `encodings`, `chartProperties`. The runtime injects the rows
(after filters), sizes the chart to its layout cell, applies the token theme
(`src/theme/flintTheme.ts`) and drops Flint's title. Never name a preset theme in a spec.

Semantic types: `Date`, `YearMonth`, `Quarter`, `Amount`, `Price`, `Count`, `Quantity`,
`Percentage`, `PercentageChange`, `Profit`, `Rank`, `Score`, `Region`, `Country`, `Category`,
`Name`, `Status`, `ID`, … (full list: `SemanticTypes` exported by `flint-chart`). Unregistered
names fail `spec:validate`.

Chart types for Vega-Lite (only these): Scatter Plot, Marginal Plot, Regression, Connected Scatter
Plot, Ranged Dot Plot, Strip Plot, Bar Chart, Grouped Bar Chart, Stacked Bar Chart, Lollipop Chart,
Waterfall Chart, Gantt Chart, Bullet Chart, Histogram, Density Plot, Ridgeline Plot, ECDF Plot,
Violin Plot, Boxplot, Pyramid Chart, Candlestick Chart, Line Chart, Sparkline, Bump Chart, Slope
Chart, Area Chart, Streamgraph, Range Area Chart, Pie Chart, Donut Chart, Rose Chart, Radar Chart,
Heatmap, Calendar Heatmap, Bar Table, KPI Card, Table, Map, Choropleth. Use `kpi` panels, not
Flint's KPI Card. Avoid Map/Choropleth: they fetch topology from public CDNs at render time.

## Validation

`npm run spec:validate` runs Flint's `validateChart` on every Flint panel with the full fixture at
a 560×300 cell, then compiles the result with Vega-Lite. Every Flint `warning` or `error` fails
validation (unknown chart type, unsupported channel, missing field, truncated categories). Fix the
spec; do not filter warnings out.

## Known limits (check before choosing Flint)

- **No time bucketing.** Flint aggregates, but `YearWeek`/`YearMonth` only label existing values;
  they do not bin dates. A weekly trend over daily rows stays in Vega-Lite (`timeUnit`).
- **Fixed cell sizes for grids.** Heatmap and Calendar Heatmap cells keep Flint's reading size
  (≈56 px heatmap, 460×140 calendar for ~4 months); they do not stretch to fill a wide panel.
  Size the layout cell to the chart, not the other way round.
- **Tooltips are basic.** Static output has no tooltip encoding; the builder switches tooltips to
  encoded fields with thousands grouping. Currency symbols and Flint's field titles may be
  missing (e.g. `revenue_sum` when Flint adds a value-label layer). Note this in reviews; the fix
  is rendering through Flint's interactive `mountChart`, which is not wired up yet.
- **Quantized legends with a `unit`** print `$−∞` for the first bucket (Flint bug in 1.0.1). Use
  `bins: 0` on the color encoding for a continuous ramp.
- **No interactions yet.** `interaction_spec` presets need `mountChart`; panels are static apart
  from tooltips. Cross-panel filtering stays with the dashboard filter bar.

## Debugging

`npm run panel:render -- <dash> <panel>` writes the Flint output as Vega-Lite
(`<dash>--<panel>.vl.json`, compiled at the real panel size) and the Vega spec. Compare the
`svg box` against the `body box`: an svg taller than the body means the legend or labels did not
fit; try a wider/taller cell before touching the theme.

## Code map

- `src/renderers/flintSpec.ts` — pure input/spec builders, shared by runtime and validation.
  Unit tests: `tests/unit/flint.test.ts`.
- `src/renderers/FlintChart.tsx` — measures the cell, lazy-loads Flint, renders via `VegaView`.
- `src/theme/flintTheme.ts` — the token-derived Flint theme (extends `datawrapper`).
- `scripts/lib/specs.ts` — semantic-type and `validateChart` checks.
