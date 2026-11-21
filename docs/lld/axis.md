---
id: axis
name: Axis
summary: Chart axis (ticks, labels, title, grid) drawn by the chart engine from the generated theme.
atomicLevel: molecule
biLevel: null
status: beta
renderEngine: vega-lite
composes: []
source: [scripts/tokens/engines.ts]
package: '@factory/panels'
registryItem: '@factory/axis'
figmaNode: null
tokens:
  [
    chart.label.typography,
    chart.label.text,
    chart.axis.domain,
    chart.axis.title-weight,
    chart.grid,
    chart.baseline,
    color.data.axis,
    color.data.gridline,
  ]
newTokens: []
props: null
dataContract: null
a11y: { role: 'part of the chart image', keyboard: 'n/a', srSummary: n/a, minContrast: 4.5 }
motion: null
perfBudget: { renderMs: 1, bundleKb: 0 }
tests: [unit, visual]
references:
  - 'https://vega.github.io/vega-lite/docs/axis.html'
  - 'https://plotly.com/javascript/axes/'
adr: [ADR-002]
---

# Axis

## Purpose

Scales and reference lines for x and y. One treatment across Vega-Lite, Flint and Plotly (Gate 0
found three). **Use** gridlines on the value axis only; **don't** add an axis title that repeats
the panel title.

## Anatomy

```
① title   ② tick labels   ③ gridlines (value axis)   ④ domain/baseline
```

## Props and variants

None: engine configuration (`scripts/tokens/engines.ts` → generated `engines.ts`).

## States

Default only. **Overflow:** long category labels are rotated or truncated by the engine.

## Token map

| Part        | Property     | Token                                        |
| ----------- | ------------ | -------------------------------------------- |
| Labels      | font, colour | `chart.label.typography`, `chart.label.text` |
| Title       | weight       | `chart.axis.title-weight`                    |
| Domain line | stroke       | `chart.axis.domain` (→ `color.data.axis`)    |
| Gridlines   | stroke       | `chart.grid` (→ `color.data.gridline`)       |
| Zero line   | stroke       | `chart.baseline`                             |

## Data binding and formatting

Tick formats come from the encoding (`axis.format` / Flint semantics). Plotly ticks need explicit
`tickformat` (Gate 0 found raw `6000`).

## Responsive and density

Engines thin ticks by available length.

## Accessibility

Part of the chart image; gridlines are decoration (no 3:1 requirement), domain lines meet 3:1.

## Motion

None.

## Dependencies and bundle

None of its own.

## Test plan

- **unit:** configs per engine. **visual:** every chart baseline.

## Open questions

None.
