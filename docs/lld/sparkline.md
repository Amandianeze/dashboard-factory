---
id: sparkline
name: Sparkline
summary: A word-sized trend line with no axes.
atomicLevel: atom
biLevel: object
status: proposed
renderEngine: d3
gap:
  priority: P2
  reason: 'The KPI card has no trend slot.'
package: '@factory/panels'
registryItem: '@factory/sparkline'
figmaNode: null
tokens:
  [color.data.categorical.1, color.data.highlight, chart.mark.line-width, chart.mark.point-diameter]
newTokens: [sparkline.height, sparkline.width]
props: ./sparkline.props.ts
dataContract: null
a11y:
  { role: 'img with aria-label from `label`', keyboard: 'n/a', srSummary: required, minContrast: 3 }
motion: null
perfBudget: { renderMs: 1, bundleKb: 1 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://d3js.org/d3-shape/line'
  - 'https://www.w3.org/WAI/tutorials/images/complex/'
adr: [ADR-002]
---

# Sparkline

## Purpose

Shows the shape of a series next to a number, without axes. **Use it** in KPI cards and table
cells. **Don't use it** when people need values off the line (a chart panel).

## Anatomy

```
① line ╱╲╱‾‾╲╱  ② last point ●
```

## Props and variants

`SparklineProps { values, label, highlightLast? }`. Width and height from `sparkline.*` tokens.

## States

Default; gaps for nulls; fewer than 2 points → nothing (the value stands alone); all equal → flat
line at mid-height.

## Token map

Line `color.data.categorical.1`, width `chart.mark.line-width`; last point
`color.data.highlight`, `chart.mark.point-diameter`; new `sparkline.height/width`.

## Data binding and formatting

React renders the path; `d3-shape` `line()` with `defined()` for gaps; `d3-scale` linear.

## Responsive and density

Fixed size; no density change.

## Accessibility

`role="img"` with the required `label` describing direction and change.

## Motion

None.

## Dependencies and bundle

`d3-shape`, `d3-scale` (main bundle).

## Test plan

- **unit:** path with gaps; flat series. **break-ui:** 10k points (decimate), all nulls.

## Open questions

None.
