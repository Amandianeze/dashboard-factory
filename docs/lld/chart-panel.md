---
id: chart-panel
name: Chart panel
summary: A chart in a panel frame, written as Vega-Lite, Flint, a D3 catalog chart or Plotly.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: react
composes:
  - panel-frame
  - legend
  - axis
source:
  - src/renderers/PanelRenderer.tsx
  - src/renderers/VegaLiteChart.tsx
  - src/renderers/FlintChart.tsx
  - src/renderers/D3Chart.tsx
  - src/renderers/PlotlyChart.tsx
panel:
  renderers:
    - vega-lite
    - flint
    - d3
    - plotly
---

# Chart panel

A chart in a panel frame, written as Vega-Lite, Flint, a D3 catalog chart or Plotly.

Built (status `beta`); the full LLD body is written in Phase 4.
