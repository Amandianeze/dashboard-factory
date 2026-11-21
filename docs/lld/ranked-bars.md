---
id: ranked-bars
name: Ranked bars
summary: Top-N horizontal bars with direct value labels; a D3 chart used inside a chart panel.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: d3
composes: []
source: [src/components/d3/RankedBars.tsx, src/components/d3/charts.ts]
package: '@factory/panels'
registryItem: '@factory/ranked-bars'
figmaNode: null
tokens:
  - chart.label.typography
  - chart.label.text
  - chart.mark.bar-radius
  - chart.ranked-bars.label-width
  - chart.ranked-bars.value-width
  - chart.ranked-bars.label-gap
  - chart.ranked-bars.value-gap
  - color.data.categorical.1
  - panel.status.text
newTokens: []
props: ./ranked-bars.props.ts
dataContract: src/components/d3/charts.ts#RankedBarsProps
a11y:
  {
    role: 'img with a summary; each bar has a <title>',
    keyboard: 'n/a (static); fallback table planned',
    srSummary: required,
    minContrast: 3,
  }
motion: null
perfBudget: { renderMs: 4, bundleKb: 2 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://d3js.org/d3-scale/band'
  - 'https://d3js.org/d3-format'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'
adr: [ADR-002]
---

# Ranked bars

## Purpose

Ranks categories by an aggregated value, largest first, with the value printed at the bar end so
no axis is needed. The reference D3 chart (ADR-002's escape hatch). **Use it** for top-N
comparisons with long category names. **Don't use it** for time on the x-axis (Vega-Lite line or
bar) or for more than 50 categories (data-table).

## Anatomy

```
① label ┊ ② bar ███████████ ③ $1.5M
        ┊      ████████     $1.1M
```

① category label column (`label-width`) · ② bar (`categorical.1`, rounded end) · ③ value label
(`value-width`). No axes, gridlines or legend.

## Props and variants

`RankedBarsProps` (Zod in `charts.ts`): `category`, `value` (fields), `aggregate` (sum, mean,
count; default sum), `limit` (1–50, default 10), `valueFormat` (d3-format, default `,.0f`).
Rendered with `D3ChartProps { data, props, width, height }`.

## States

- **Empty:** `No data` paragraph (Gate 3 deprecation 4 → empty-state).
- **Overflow:** labels longer than `label-width` are clipped, not truncated with an ellipsis.
- Loading, error: from the chart panel. Hover: native SVG `<title>`. No focus states.

## Token map

| Part       | Property     | Token                                               |
| ---------- | ------------ | --------------------------------------------------- |
| Labels     | font, colour | `chart.label.typography`, `chart.label.text`        |
| Bars       | fill, radius | `color.data.categorical.1`, `chart.mark.bar-radius` |
| Columns    | widths, gaps | `chart.ranked-bars.*`                               |
| Empty text | colour       | `panel.status.text`                                 |

## Data binding and formatting

`groupAggregate(rows, [category], value, aggregate)`, non-finite values dropped, sorted
descending, sliced to `limit`. `fieldProps` (`category`, `value`) are checked against the dataset.

## Responsive and density

Bar length scales to the remaining width; band height to the cell height (padding 0.28). Below
about 240 px wide the value column crowds the bars; not handled.

## Accessibility

Needs an `aria-label` summary on the SVG ("Top 10 products by revenue; highest Widget at $1.5M")
and the data-table fallback. Bars use one hue, so no colour-only meaning.

## Motion

None.

## Dependencies and bundle

`d3-scale`, `d3-format` (main bundle). React renders the SVG; D3 only computes.

## Test plan

- **unit:** ranking, limit, non-finite filtering.
- **visual:** `revenue-overview--by-product` baseline.
- **break-ui:** 50 bars in 300 px, 60-character labels, all zeros, one category, negative values
  (x domain starts at 0: negatives are not supported and should be rejected or diverge).

## Open questions

1. Negative values: reject in validation, or support a diverging layout? Owner: chart-builder.
