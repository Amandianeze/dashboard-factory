---
id: delta-indicator
name: Delta indicator
summary: Direction glyph plus signed change, coloured positive or negative.
atomicLevel: atom
biLevel: object
status: beta
renderEngine: react
package: '@factory/panels'
registryItem: '@factory/delta-indicator'
figmaNode: null
tokens:
  - kpi.delta.positive.text
  - kpi.delta.negative.text
  - delta.neutral.text
  - delta.gap
  - delta.typography
props: ./delta-indicator.props.ts
dataContract: null
a11y:
  {
    role: 'text; sr reads "up 2.1% versus previous close"',
    keyboard: 'n/a',
    srSummary: required,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.2, bundleKb: 0.5 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html'
  - 'https://d3js.org/d3-format'
adr: [ADR-002]
source:
  - src/components/ui/delta-indicator.tsx
---

# Delta indicator

## Purpose

Shows how much something changed and whether that is good. **Use it** next to a KPI value or in
a table. **Don't use it** for the value itself (formatted-value).

## Anatomy

```
① ▲  ② +2.10%       ① ▼  ② −23.59       ① ●  ② 0.00
```

## Props and variants

`DeltaIndicatorProps { value, format, polarity?, comparisonLabel? }`. `polarity`: up-is-good
(default) · down-is-good (costs, latency) · neutral (no colour).

## States

Positive, negative, zero (neutral glyph and colour), missing (em dash). Not interactive.

## Token map

| Part           | Token                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Good direction | `kpi.delta.positive.text` (→ `color.data.positive`)                      |
| Bad direction  | `kpi.delta.negative.text` (→ `color.data.negative`, magenta-red, Gate 1) |
| Neutral / zero | `delta.neutral.text` (new → `color.text.muted`)                          |
| Text           | `delta.typography` (new → `typography.body-strong`)                      |

## Data binding and formatting

Signed d3-format (`+,.2f`, `+.2%`); the glyph comes from the sign, the colour from sign ×
polarity. Uses the U+2212 minus from d3-format.

## Responsive and density

Inline; no change.

## Accessibility

Glyph and sign carry direction without colour (WCAG 1.4.1). The glyph is `aria-hidden`; the sr
text spells "up" / "down" and the comparison.

## Motion

None.

## Dependencies and bundle

`d3-format`.

## Test plan

- **unit:** glyph, colour role and sr text for each sign × polarity; missing → dash.
- **visual:** light/dark/hc. **break-ui:** 10⁹ change, −0.

## Open questions

None.
