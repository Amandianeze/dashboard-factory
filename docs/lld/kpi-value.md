---
id: kpi-value
name: KPI value with delta
summary: A current value with its change against a comparison period.
atomicLevel: molecule
biLevel: pattern
status: proposed
renderEngine: react
composes: [formatted-value, delta-indicator]
gap:
  priority: P1
  reason: 'Period comparison: sp500-today shows change, change % and previous close as three unrelated tiles.'
package: '@factory/panels'
registryItem: '@factory/kpi-value'
figmaNode: null
tokens:
  [
    kpi.value.typography,
    kpi.value.text,
    kpi.delta.positive.text,
    kpi.delta.negative.text,
    space.inline.sm,
    color.text.muted,
  ]
newTokens: [kpi.comparison.typography]
props: ./kpi-value.props.ts
dataContract: docs/lld/kpi-value.props.ts#KpiComparison
a11y:
  {
    role: 'text group; sr reads value, then change and comparison',
    keyboard: 'n/a',
    srSummary: required,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 0.5 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://www.sqlbi.com/'
  - 'https://d3js.org/d3-format'
adr: [ADR-002, ADR-005]
---

# KPI value with delta

## Purpose

The period-comparison pattern: current value, change and change % against a comparison, in one
card. Replaces separate change / change % / previous-close tiles (Gate 3 deprecation 8). **Use
it** when the change matters as much as the value. **Don't use it** for comparisons across
categories (a chart).

## Anatomy

```
① 6,612.40
② ▲ +23.59  ▲ +0.36%  ③ vs previous close 6,588.81
```

## Props and variants

`KpiValueProps { current, previous, format, comparison }`. The spec gets an optional
`compareTo` block on KPI panels (data contract `KpiComparison`): `compareTo.field`, `show`
(delta, delta-pct), `deltaFormat`, `polarity`.

## States

Both values present; previous missing (deltas → dash); previous zero (delta % → dash, not ∞).

## Token map

Value as kpi-card; deltas via delta-indicator; comparison caption new `kpi.comparison.typography`
(→ `typography.caption`) in `color.text.muted`.

## Data binding and formatting

delta = current − previous; delta % = delta / |previous|. Signed formats from `deltaFormat`.

## Responsive and density

Second line wraps under the value in narrow cells.

## Accessibility

Read as one sentence: "6,612.40, up 23.59, up 0.36 percent versus previous close".

## Motion

None.

## Dependencies and bundle

formatted-value, delta-indicator.

## Test plan

- **unit:** delta maths incl. previous 0 and negatives; schema defaults.
- **break-ui:** 10⁹ values in span 2.

## Open questions

1. `compareTo` by period offset (e.g. same day last year) needs the semantic layer; field-based
   only for now? Owner: project owner.
