---
id: kpi-card
name: KPI card
summary: One headline number in a panel.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: react
composes: [panel-frame, formatted-value, kpi-value]
source: [src/renderers/KpiCard.tsx]
panel: { renderers: [kpi] }
package: '@factory/panels'
registryItem: '@factory/kpi-card'
figmaNode: null
tokens: [kpi.value.typography, kpi.value.text, panel.status.text]
newTokens: [kpi.label.typography, kpi.sparkline.height]
props: ./kpi-card.props.ts
dataContract: src/spec/schema.ts#KpiPanel
a11y:
  {
    role: 'group (panel frame section, named by its h2)',
    keyboard: 'n/a (not interactive)',
    srSummary: required,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 2, bundleKb: 1 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://d3js.org/d3-format'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'
  - 'https://atomicdesign.bradfrost.com/chapter-2/'
adr: [ADR-002, ADR-005]
---

# KPI card

## Purpose

Shows one number that answers one question ("Revenue this period"). The most reused visual in the
factory (9 of 14 panels). **Use it** for a single aggregate. **Don't use it** for a comparison
shown as several tiles (use the `compareTo` addition from [kpi-value](kpi-value.md)), a value
that needs its trend to be read (add the sparkline slot), or more than one number (use a
[data-table](data-table.md) or a chart).

## Anatomy

```
┌ panel-frame ──────────────────────┐
│ ① title (h2)                      │
│                                   │
│ ② $1,234,567   ③ ▲ +2.1%  ④ ~~~   │
└───────────────────────────────────┘
```

① panel-frame heading · ② formatted-value (kpi size), bottom-aligned · ③ delta-indicator and
④ sparkline: **planned slots** (kpi-value, sparkline), not built.

## Props and variants

`KpiCardProps { panel: KpiPanel; rows: Row[] }`. No `cva` variants today. Planned: `compareTo`
(adds ③ via kpi-value) and `trend` (adds ④). The value is `aggregate(rows, field, aggregate)`.

## States

- **Default:** formatted value in `kpi.value.*`.
- **Empty / no finite values:** em dash `—` (aggregate returns NaN). `count` of zero rows shows `0`,
  which is correct. Replace the bare dash with formatted-value's accessible "no data".
- **Loading:** none of its own; the template shows a page-level line today (→ Skeleton `kpi`).
- **Error:** the panel frame's error boundary.
- **Overflow:** a long value (10⁹ with `$,.0f` = 14 characters) can exceed a 2-column cell. Not handled.
- Hover, focus, active, disabled: n/a (not interactive).

## Token map

| Part         | Property | Token                             |
| ------------ | -------- | --------------------------------- |
| Value        | font     | `kpi.value.typography`            |
| Value        | colour   | `kpi.value.text`                  |
| Empty dash   | colour   | `panel.status.text` (planned)     |
| Frame, title | —        | see [panel-frame](panel-frame.md) |

## Data binding and formatting

Data contract `KpiPanel`: `field`, `aggregate` (sum, mean, min, max, count, distinct), `format`
(d3-format, default `,.0f`). Filters apply before aggregation. Gate 3 deprecation 9: one-row
datasets use `max` to mean "the value"; a `last` aggregate replaces that.

## Responsive and density

Fills its grid cell; below the stack breakpoint the panel takes the full width with
`layout.panel.stacked-min-height`. Compact density shrinks the frame padding, not the value size.

## Accessibility

Named by the frame's h2 (`aria-labelledby`). The value is plain text, so it reads as
"Revenue, $1,234,567". The em dash must read as "no data" (via formatted-value). Contrast of
`kpi.value.text` on `panel.bg` is in the contrast matrix (≥ 4.5).

## Motion

None. A value count-up was considered and rejected: it delays reading the number.

## Dependencies and bundle

`d3-format` (already in the main bundle via `d3`). No lazy chunk.

## Test plan

- **unit:** aggregate per op; NaN → dash; count of zero rows → 0.
- **visual:** per-panel baselines (9 KPIs across both dashboards).
- **a11y:** heading names the region; dash announced as "no data".
- **break-ui:** 10⁹ value in span 2; negative value; empty dataset; filtered-to-nothing.

## Open questions

1. Overflow strategy for long values: compact notation (`$1.2B`) or font step-down? Owner: design review.
