---
name: vega-lite
description: Patterns and pitfalls for writing Vega-Lite specs inside dashboard panels (renderer vega-lite) — encodings, aggregation, time units, formatting, theming. Use when writing or debugging a vega-lite panel.
---

# Vega-Lite in this project

The runtime (`src/renderers/vegaLiteSpec.ts`) wraps each panel spec with `$schema` (v6),
`data: {values}`, `width/height: "container"`, `autosize: fit` and the token theme
(`src/theme/vegaTheme.ts`). So panel specs contain only `mark`, `encoding`, `transform`, `layer`,
`params`, and optional `config` overrides. Validate with `npm run spec:validate` (it compiles every
VL panel). For current docs, use the Context7 MCP (`vega-lite`).

## Patterns (compact; switch to block style when a line gets long)

Time series, aggregated per week:

```yaml
mark: { type: line }
encoding:
  x: { field: date, timeUnit: utcyearweek, type: temporal, title: null }
  y: { field: revenue, aggregate: sum, type: quantitative, title: Revenue, axis: { format: '$~s' } }
  color: { field: region, type: nominal, title: null }
```

Sorted ranking bar:

```yaml
mark: bar
encoding:
  y: { field: product, type: nominal, sort: '-x', title: null }
  x: { field: revenue, aggregate: sum, type: quantitative }
```

Heatmap: `mark: rect`, two nominal axes, `color` with an aggregate (uses the sequential ramp).

Derived fields: `transform: [{ calculate: "datum.revenue / datum.orders", as: aov }]` — fields
created with `as` in `transform` are exempt from the dataset field check.

## Rules

- Aggregate in the encoding (`aggregate: sum`) rather than pre-aggregating data.
- Always set `type` on every encoding channel.
- Tooltips on every chart; give tooltip numbers a `format`.
- Date-only strings (`2026-04-05`) parse as UTC, so use `utc*` time units (`utcyearweek`,
  `utcyearmonth`); local units shift buckets by a day for viewers west of UTC.
- Weeks start on Sunday. Make sure the data covers whole periods or the first/last
  bucket will look like a drop.
- Never set colors inline unless encoding meaning (e.g. a red threshold); the theme provides the
  categorical and sequential ranges.
- Quote d3-format strings: `format: '$,.0f'`.
- Interactions (`params` with selections) work within a panel; cross-panel brushing is phase 2.
