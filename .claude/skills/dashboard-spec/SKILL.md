---
name: dashboard-spec
description: Reference for writing and editing dashboard spec YAML files (dashboards/*.dashboard.yaml) — structure, renderer choice, field declarations, layout, filters and common validation errors. Use whenever creating or changing a dashboard spec.
---

# Dashboard spec reference

The authoritative definition is `src/spec/schema.ts`; this is the working guide. Specs start with
`# yaml-language-server: $schema=./dashboard.schema.json` for editor autocomplete.

## Skeleton

```yaml
version: 1
id: kebab-or_snake # must equal the file name: <id>.dashboard.yaml
title: Human title
description: Who it is for and which decisions it supports.
datasets:
  sales:
    source: fixture # fixture (public/data/<path>) | api (phase 3: endpoint)
    path: sales_daily.json
    fields: # declare EVERY field any panel or filter uses
      date: temporal
      region: nominal
      revenue: quantitative
filters:
  - id: region
    label: Region
    type: multiselect
    dataset: sales
    field: region
    appliesTo: [revenue_total]
layout:
  rows:
    - height: 132 # px; 132 for KPI rows, 300–380 for charts
      cells:
        - panel: revenue_total
          span: 4 # spans per row ≤ 12
panels:
  revenue_total:
    title: Revenue
    dataset: sales
    renderer: kpi
    field: revenue
    aggregate: sum
    format: '$,.0f'
```

## Renderers

- **`kpi`** — `field`, `aggregate` (sum, mean, min, max, count, distinct), `format`. sum and mean
  need a quantitative field.
- **`vega-lite`** — `spec`: a Vega-Lite spec without data, width or height. The default for
  charts; see the `vega-lite` skill.
- **`d3`** — `component` (a catalog name) and `props`, validated by that entry's propsSchema.
- **`plotly`** — `trace` with `type` (scatter or bar), `x`, `y`, and optional `groupBy`,
  `aggregate`, `mode`; optional `layout`. Basic bundle only; see the `plotly` skill.

## Validation errors you will see

- `field "x" is not declared in dataset "y"` → add it to `datasets.y.fields` (check the fixture has it) or fix the typo.
- `panel "p" is not placed in layout.rows` / `unknown panel` → every panel exactly once in layout.
- `row spans must total 12 or less`.
- `invalid d3-format specifier` → quote it: `format: '$,.0f'`. Unquoted commas inside `{ ... }`
  silently split the value.
- `omit data` / `omit width/height` → remove them from the Vega-Lite spec.
- `unknown D3 chart` → use a catalog name or ask chart-builder to add one.
- `Vega-Lite compile failed` → the VL spec is invalid; read the message, check the `vega-lite` skill.
- `missing from fixture rows` → declared field does not exist in the data.

## Style

- Panel ids: snake_case nouns (`revenue_total`, `by_product`). Titles state measure + breakdown.
- Block-style YAML for anything nested deeper than one level.
- One question per panel. If a panel needs a paragraph to explain, split it.
