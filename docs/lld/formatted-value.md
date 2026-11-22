---
id: formatted-value
name: Formatted value
summary: A number formatted from a format token, in tabular numerals; an em dash when missing.
atomicLevel: atom
biLevel: object
status: beta
renderEngine: react
composes: []
source: [src/components/ui/formatted-value.tsx, src/renderers/KpiCard.tsx]
package: '@factory/format'
registryItem: '@factory/formatted-value'
figmaNode: null
tokens: [kpi.value.typography, kpi.value.text, color.text.primary, color.text.muted]
newTokens: []
props: ./formatted-value.props.ts
dataContract: null
a11y:
  {
    role: 'text; missing values carry an sr-only "no data"',
    keyboard: 'n/a',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.2, bundleKb: 0.5 }
tests: [unit, a11y, break-ui]
references:
  - 'https://d3js.org/d3-format'
  - 'https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric'
adr: [ADR-002]
---

# Formatted value

## Purpose

The SQLBI "formatted value" object: a number shown the same way everywhere it appears. **Use it**
for any figure outside a chart (KPI, table cell, delta). **Don't** format numbers inline with
`toLocaleString` or ad-hoc strings.

## Anatomy

```
$1,234,567        —  (no data)
```

## Props and variants

`FormattedValueProps { value, format, size? }`. `size`: `kpi` | `body`.

## States

Default; **missing** (null, undefined, NaN, ±Infinity) → `—` with sr-only "no data". Negative uses
the format's minus sign (U+2212 from d3-format).

## Token map

| Part | Property     | Token                                                 |
| ---- | ------------ | ----------------------------------------------------- |
| kpi  | font, colour | `kpi.value.typography`, `kpi.value.text`              |
| body | colour       | `color.text.primary`; missing dash `color.text.muted` |

Always `font-variant-numeric: tabular-nums` so columns of figures align.

## Data binding and formatting

d3-format specifiers today. When the `format` module lands (`tokens/format.json` +
dataset semantics), `format` becomes a format token name.

## Responsive and density

None.

## Accessibility

Plain text. The dash alone reads as "dash", hence the sr-only text.

## Motion

None.

## Dependencies and bundle

`d3-format`.

## Test plan

- **unit:** every missing case → dash; negative zero; 10⁹; `$~s` compact.

## Open questions

None.
