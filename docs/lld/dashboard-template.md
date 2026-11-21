---
id: dashboard-template
name: Dashboard template
summary: 'Title band, filter bar, then 12-column rows of panels: KPI band, primary chart, supporting
  charts.'
atomicLevel: template
biLevel: page-template
status: beta
renderEngine: react
composes:
  - title-band
  - filter-bar
  - kpi-card
  - chart-panel
source:
  - src/dashboard/DashboardView.tsx
---

# Dashboard template

Title band, filter bar, then 12-column rows of panels: KPI band, primary chart, supporting charts.

Built (status `beta`); the full LLD body is written in Phase 4.
