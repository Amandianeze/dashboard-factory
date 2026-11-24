---
id: dashboard-template
name: Dashboard template
summary: Title band, filter bar, then 12-column rows of panels; KPI band, primary chart, supporting charts.
atomicLevel: template
biLevel: page-template
status: beta
renderEngine: react
composes: [title-band, filter-bar, kpi-card, chart-panel]
source: [src/dashboard/DashboardView.tsx]
package: '@factory/panels'
registryItem: '@factory/dashboard-template'
figmaNode: null
tokens:
  [
    page.bg,
    page.padding.x,
    page.padding.top,
    page.padding.bottom,
    space.grid.gap,
    layout.grid.columns,
    layout.container.max,
    panel.status.text,
  ]
newTokens: []
props: ./dashboard-template.props.ts
dataContract: src/spec/schema.ts#DashboardSpec
a11y:
  {
    role: 'main; each panel a section named by its h2',
    keyboard: 'Tab order follows reading order: filters, then rows left to right',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 16, bundleKb: 4 }
tests: [unit, a11y, visual, break-ui]
references:
  - 'https://atomicdesign.bradfrost.com/chapter-2/'
  - 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/'
adr: [ADR-002, ADR-004]
---

# Dashboard template

## Purpose

The page structure every dashboard spec fills: title band, filter bar, rows of panels on a
12-column grid. The usual order (from the `chart-choice` skill and the reuse scan) is a KPI band,
one primary chart, then supporting charts. **Use it** for every `.dashboard.yaml`. **Don't use
it** for product screens (CRUD templates, proposed).

## Anatomy

```
main.dashboard
├ ① title-band (h1 + description)
├ ② filter-bar
└ ③ rows: grid of 12 columns, fixed height per row
     └ panel-frame (span n) → kpi-card | chart-panel
```

## Props and variants

`DashboardTemplateProps { spec, actions? }`. Rows come from `spec.layout.rows` (height in px,
cells with `span`). `actions` are page-level controls from the app shell (the theme picker), passed
to the title band; an embedding host leaves them out. No variants.

## States

- **Loading:** "Loading data…" line (`.status`; Gate 3 deprecation 6 → Skeleton per panel).
- **Error:** dataset load failure as a red line with `role="alert"` (→ empty-state `error`).
- **Empty dashboard:** impossible; the schema needs at least one row.

## Token map

| Part        | Property            | Token                                   |
| ----------- | ------------------- | --------------------------------------- |
| Page        | background, padding | `page.bg`, `page.padding.*`             |
| Grid        | columns, gap        | `layout.grid.columns`, `space.grid.gap` |
| Container   | max width           | `layout.container.max`                  |
| Status line | colour              | `panel.status.text`                     |

## Data binding and formatting

Loads every dataset (`useDatasets`), applies filters per panel (`applyFilters`), passes rows to
each panel. Data contract `DashboardSpec`.

## Responsive and density

Below `layout.breakpoint.stack` (760 px; a raw value in the media query, since CSS variables
can't be used there) rows become one column with auto height. Compact density tightens padding
and gaps through density tokens.

## Accessibility

One `main`, one h1 (title band), each panel a `section` labelled by its h2. Reading and tab order
follow the spec order. A visually hidden `role="status"` line under the filter bar announces each
filter change politely: the selection in force and how many panels it leaves empty
(`filterAnnouncement` in `src/data/transforms.ts`). It stays silent on first load.

## Motion

None.

## Dependencies and bundle

React only; engines load per panel (see chart-panel).

## Test plan

- **visual:** full-page baselines per dashboard.
- **a11y:** landmarks and heading order; the filter status line (unit + e2e `chart-alternatives`).
- **break-ui:** 20 panels, a row of 12 span-1 KPIs, a 900 px row.

## Open questions

1. Named regions (kpis, primary, supporting) in the spec instead of plain rows? Owner: spec-author.
