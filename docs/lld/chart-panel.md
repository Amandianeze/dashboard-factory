---
id: chart-panel
name: Chart panel
summary: A chart in a panel frame, written as Vega-Lite, Flint, a D3 chart or Plotly.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: react
composes: [panel-frame, legend, axis]
source:
  - src/renderers/PanelRenderer.tsx
  - src/renderers/VegaLiteChart.tsx
  - src/renderers/FlintChart.tsx
  - src/renderers/D3Chart.tsx
  - src/renderers/PlotlyChart.tsx
panel: { renderers: [vega-lite, flint, d3, plotly] }
package: '@factory/panels'
registryItem: '@factory/chart-panel'
figmaNode: null
tokens:
  [
    chart.label.typography,
    chart.label.text,
    chart.grid,
    chart.padding,
    color.data.categorical.1,
    panel.status.text,
  ]
newTokens: []
props: ./chart-panel.props.ts
dataContract: src/spec/schema.ts#PanelSpec
a11y:
  {
    role: 'group (frame) + img (chart svg) with a data-table fallback',
    keyboard: 'Tab to the chart; tooltips on focus (Vega); fallback table is keyboard-readable',
    srSummary: required,
    minContrast: 3,
  }
motion: null
perfBudget: { renderMs: 50, bundleKb: 2 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://vega.github.io/vega-lite/docs/'
  - 'https://microsoft.github.io/flint-chart/'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'
  - 'https://www.w3.org/WAI/tutorials/images/complex/'
adr: [ADR-002]
---

# Chart panel

## Purpose

Puts one chart in a panel frame and sizes it to the grid cell. The chart is written in the engine
ADR-002 picks for its family. **Use it** for any chart. **Don't use it** for a single number
([kpi-card](kpi-card.md)) or for exact values people look up ([data-table](data-table.md)).

## Anatomy

```
┌ panel-frame ─────────────────────────────┐
│ ① title (h2)                             │
│ ② legend (top, horizontal)               │
│ ③ plot area ─ ④ axes, gridlines, marks   │
│ ⑤ text alternative (sr-only) + table     │
└──────────────────────────────────────────┘
```

② [legend](legend.md) and ④ [axis](axis.md) are drawn by the engine from the generated theme.
⑤ is **planned** (no text alternative today).

## Props and variants

`ChartPanelProps { panel, dataset, rows }`. `panel.renderer` picks the adapter: `VegaLiteChart`,
`FlintChart`, `D3Chart` (by `component` in `src/components/d3/charts.ts`), `PlotlyChart`. No
visual variants; engine choice is the variant.

## States

- **Loading:** engines load lazily; the cell is blank until the chunk arrives (→ Skeleton `chart`).
- **Empty:** inconsistent today — D3 says "No data", Vega-Lite, Flint and Plotly draw empty axes
  (Gate 3 deprecation 4 → [empty-state](empty-state.md) `empty` / `filtered`).
- **Error:** frame error boundary; Vega compile errors surface there.
- **Overflow:** legends wrap; heatmap keys sit beside the plot (Gate 2, decision 1).
- Hover: engine tooltips. Focus: Vega tooltips on focus; D3 and Plotly have none.

## Token map

| Part          | Property     | Token                                                 |
| ------------- | ------------ | ----------------------------------------------------- |
| Labels, ticks | font, colour | `chart.label.typography`, `chart.label.text`          |
| Gridlines     | stroke       | `chart.grid`                                          |
| Plot inset    | padding      | `chart.padding`, `chart.inset.*`                      |
| Series        | colour       | `color.data.categorical.1–10` (via the engine themes) |
| Status text   | colour       | `panel.status.text`                                   |

Engines read these through `src/theme/generated/engines.ts`, never directly.

## Data binding and formatting

Data contract `PanelSpec` (the chart members). Rows are filtered by the dashboard first. Vega-Lite
and Flint get rows injected as `data`; specs never carry data, width or height. Formats: d3-format
strings in specs, Flint `semantics` on the dataset (one format source is open, ADR-002).

## Responsive and density

The adapter measures its cell (`useElementSize`) and redraws on resize. Below the stack breakpoint
rows lose their fixed height; charts keep `layout.panel.stacked-min-height`.

## Accessibility

Each chart needs a text alternative: a one-sentence summary (`aria-describedby`) and a
[data-table](data-table.md) fallback reachable by keyboard (principle 6). **Not built.** Series
colours pass the CVD separability check (`tokens:validate`); non-text contrast 3:1 for marks and
gridlines that carry meaning.

## Motion

None. Engine transitions are off; filter changes redraw without animation.

## Dependencies and bundle

Frame code ~2 kB. Engines are lazy chunks (gzip): Vega-Lite/embed 272 kB, Flint 425 kB,
Plotly basic 385 kB; D3 is in the main bundle. A page loads only the engines its panels use.

## Test plan

- **unit:** spec builders (`vegaLiteSpec.ts`, `flintSpec.ts`, `plotlyFigure.ts`) are pure and tested.
- **visual:** per-panel baselines; the same dataset per engine in Storybook (Phase 5).
- **a11y:** summary present; fallback table reachable.
- **break-ui:** zero rows, filtered to zero, 10k rows (render-performance budget), long category labels.

## Open questions

1. Where the text alternative comes from: generated from the spec (field + aggregate) or written
   per panel (`description`)? Owner: design review.
