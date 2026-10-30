---
description: Add a panel to an existing dashboard spec
argument-hint: <dashboard-id> <what the panel should show>
---

Add a panel to an existing dashboard. Arguments: $ARGUMENTS

1. Read `dashboards/<dashboard-id>.dashboard.yaml` and the `dashboard-spec` skill.
2. Pick the renderer (kpi → vega-lite → d3 catalog → plotly), declare any new dataset fields,
   place the panel in the layout (keep spans ≤ 12 per row), and add it to relevant filters'
   `appliesTo`.
3. If a new D3 component is needed, use the **chart-builder** subagent.
4. `npm run spec:validate -- dashboards/<id>.dashboard.yaml`, then `npm run verify`.
5. `npm run test:e2e -- --update-snapshots`, look at the new panel's screenshot, and report.
