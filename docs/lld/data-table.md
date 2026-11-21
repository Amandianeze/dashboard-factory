---
id: data-table
name: Data table
summary: Rows and columns with sorting, number formats and conditional formats; also the text alternative for every chart.
atomicLevel: organism
biLevel: visual
status: proposed
renderEngine: react
composes: [formatted-value, badge, empty-state, skeleton]
panel: { renderers: [] }
gap:
  priority: P1
  reason: 'Gate 2 gap (no table or matrix), and the data-table fallback every chart needs for accessibility. Needs a `table` renderer.'
package: '@factory/panels'
registryItem: '@factory/data-table'
figmaNode: null
tokens:
  [
    color.text.primary,
    color.text.muted,
    color.border.subtle,
    color.bg.surface,
    color.bg.surface-raised,
    typography.body,
    typography.label,
    color.data.sequential.blue.1,
    color.data.diverging.blue-orange.0,
    color.data.positive,
    color.data.negative,
    color.focus.ring,
  ]
newTokens:
  [
    table.header.typography,
    table.header.text,
    table.row.border,
    table.row.hover.bg,
    table.cell.padding.x,
    table.cell.padding.y,
    table.sort.icon,
  ]
props: ./data-table.props.ts
dataContract: docs/lld/data-table.props.ts#TablePanel
a11y:
  {
    role: 'table with caption; sortable headers are buttons with aria-sort',
    keyboard: 'Tab to header buttons; Enter/Space sorts; table scrolls in a focusable region',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 16, bundleKb: 4 }
tests: [unit, interaction, a11y, visual, break-ui]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/'
  - 'https://www.w3.org/WAI/tutorials/tables/'
  - 'https://ui.shadcn.com/docs/components/data-table'
adr: [ADR-002, ADR-003, ADR-004]
---

# Data table

## Purpose

Exact values people look up or compare row by row, with sorting and conditional formats (the BI
"matrix"). Also every chart's text alternative (principle 6). **Use it** for lists, top-N with
several measures, and drill-down. **Don't use it** when the shape matters more than the values
(a chart).

## Anatomy

```
caption: ① Orders by status
┌ ② header (sortable) ┬──────────┬────────────┐
│ Order               │ Status   │    Revenue ▼│
├─────────────────────┼──────────┼────────────┤
│ #1042               │ (Shipped)│   $1,230.00 │  ③ rows: badge, formatted-value
└─────────────────────┴──────────┴────────────┘
④ Show all 1,204 rows
```

## Props and variants

`DataTableProps { columns, rows, caption, sort?, onSortChange?, limit? }`. Panel spec
`TablePanel` (`renderer: table`, `columns[]`, `sort`, `limit`). Column options: `format`,
`align`, `conditional` (sequential ramp, diverging ramp, ± sign colour).

## States

Default; hover row; focused header; sorted asc/desc; loading (Skeleton `table`); empty / filtered
/ error (EmptyState); overflow: horizontal scroll inside a focusable region; > `limit` rows
behind "Show all"; > 500 rows virtualised.

## Token map

New `table.*` tokens for header type/colour, row borders (→ `color.border.subtle`), hover
(→ `color.bg.surface-raised`), cell padding (density-aware). Conditional formats use the
existing sequential/diverging ramps and `color.data.positive/negative` with text contrast checked.

## Data binding and formatting

Rows after filters; numbers right-aligned in tabular numerals via formatted-value; status columns
via Badge. Sorting is client-side, stable, locale-aware for strings.

## Responsive and density

Scrolls horizontally below its content width; first column sticky. Compact density halves the
vertical cell padding.

## Accessibility

Native `table` with `caption` and `th scope`. Sortable headers follow the APG sortable-table
example (button in `th`, `aria-sort`). Conditional colours never carry meaning alone (values are
printed).

## Motion

None.

## Dependencies and bundle

No grid library at first (~4 kB). Virtualisation (> 500 rows) needs a dependency, decided with
`pick-ui-library` when needed.

## Test plan

- **unit:** sort stability, formats, conditional mapping. **interaction:** sort by keyboard.
- **a11y:** caption, scope, aria-sort. **break-ui:** 0 rows, 10k rows, 40 columns, RTL, nulls.

## Open questions

1. Is the chart fallback the same component (hidden behind "Show data") or a lighter static
   table? Owner: design review.
