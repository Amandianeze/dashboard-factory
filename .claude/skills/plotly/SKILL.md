---
name: plotly
description: When and how to use Plotly panels (renderer plotly) in this project — supported trace types, grouping, aggregation, layout overrides and bundle constraints. Use when writing a plotly panel or changing src/renderers/Plotly*.
---

# Plotly in this project

Plotly is the third choice after Vega-Lite and D3. Use it when users need built-in zoom/pan/hover
on dense scatter or bar data. It ships as `plotly.js-basic-dist-min` (~1.1 MB, lazy-loaded into its
own chunk), which includes only `scatter` (also lines) and `bar` traces. Adding other trace types
means switching bundles — raise it as an architecture decision, don't just change the import.

## Panel shape

```yaml
renderer: plotly
trace:
  type: scatter # scatter | bar
  x: orders
  y: revenue
  groupBy: region # optional: one trace per value, colored from the categorical palette
  aggregate: sum # optional: sum | mean of y per x (and group)
  mode: markers # scatter only: markers | lines | lines+markers
layout: {} # optional Plotly layout overrides; avoid colors/fonts (tokens own them)
```

## Implementation notes

- `src/renderers/plotlyFigure.ts` is a pure spec → `{data, layout}` builder; unit-test changes there.
- `PlotlyChart.tsx` calls `Plotly.react` with explicit width/height from ResizeObserver and
  `Plotly.purge` on unmount. Keep `displayModeBar: false` unless a spec asks otherwise.
- The legend is anchored to the container top (`yref: 'container'`) so it never overlaps axes.
