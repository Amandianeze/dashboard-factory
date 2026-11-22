---
id: chart-panel
name: Chart panel
summary: A chart in a panel frame, written as Vega-Lite, Flint, a D3 chart or Plotly.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: react
composes: [panel-frame, legend, axis, data-table, button, empty-state]
source:
  - src/components/panels/chart-panel.tsx
  - src/data/chartData.ts
  - src/renderers/vegaChartData.ts
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
    role: 'region (frame) + img named by the title, described by the summary; a table view',
    keyboard: 'Tab to Table; Enter/Space swaps chart and table; then Tab into the scrolling table',
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
⑤ is the generated summary and the **Table** toggle at the end of the header.

## Props and variants

`ChartPanelProps { id, span, panel, dataset, rows, empty? }`. `panel.renderer` picks the adapter: `VegaLiteChart`,
`FlintChart`, `D3Chart` (by `component` in `src/components/d3/charts.ts`), `PlotlyChart`. No
visual variants; engine choice is the variant.

## States

- **Loading:** engines load lazily; the cell is blank until the chunk arrives (→ Skeleton `chart`).
- **Empty:** EmptyState `empty` or `filtered` in place of the chart; no Table toggle.
- **Table:** the chart stays mounted, invisible, under the table so both follow filters.
- **Error:** frame error boundary; Vega compile errors surface there.
- **Overflow:** legends wrap; heatmap keys sit beside the plot (Gate 2, decision 1).
- Hover: engine tooltips. They are mouse-only; the table carries the same values for keyboards.

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

Two parts, following the W3C pattern for complex images:

- **Short:** the plot is one `img`, named by the panel title and described by the panel
  `description` plus a generated summary (number of data points, each measure's range and where
  its extremes are). Screen readers don't step through thousands of marks.
- **Long:** **Table** swaps in a [data-table](data-table.md) of the rows the engine drew:
  aggregates, bins, time units and filters as plotted, with exact values in place of `$1.5M`.

Where the rows come from: Vega-Lite and Flint from the compiled datasets the marks use
(`vegaChartData`), Plotly from its figure (`plotlyChartData`), D3 from the registry's required
`chartData`, which shares the component's shaping function. If no single drawn dataset has every
encoded field (concat, repeat), the table shows the panel's source rows and the summary says so.

Limits: the summary states ranges, not trends or causes; put the point of the chart in
`description`. Rule lines at a constant (`datum`) are not in the table. Series colours pass the
CVD separability check (`tokens:validate`); non-text contrast 3:1 for marks and gridlines that
carry meaning.

## Motion

None. Engine transitions are off; filter changes redraw without animation.

## Dependencies and bundle

Frame code ~2 kB. Engines are lazy chunks (gzip): Vega-Lite/embed 272 kB, Flint 425 kB,
Plotly basic 385 kB; D3 is in the main bundle. A page loads only the engines its panels use.

## Test plan

- **unit:** spec builders (`vegaLiteSpec.ts`, `flintSpec.ts`, `plotlyFigure.ts`) are pure and tested.
- **visual:** per-panel baselines; the same dataset per engine in Storybook (Phase 5).
- **a11y:** summary present; table view opened by keyboard in each engine's story and dashboard.
- **break-ui:** zero rows, filtered to zero, 10k rows (render-performance budget), long category labels.

## Open questions

1. Is a generated range summary enough, or should specs get an authored `takeaway` field?
   Today: generated, plus `description`. Owner: design review.
