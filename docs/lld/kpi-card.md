---
id: kpi-card
name: KPI card
summary: One headline number in a panel.
atomicLevel: organism
biLevel: visual
status: beta
renderEngine: react
composes:
  - panel-frame
  - formatted-value
source:
  - src/renderers/KpiCard.tsx
panel:
  renderers:
    - kpi
---

# KPI card

One headline number in a panel.

Built (status `beta`); the full LLD body is written in Phase 4.
