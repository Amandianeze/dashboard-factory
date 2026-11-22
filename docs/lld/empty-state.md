---
id: empty-state
name: Empty state
summary: What a panel shows with no data, or when it fails.
atomicLevel: molecule
biLevel: null
status: beta
renderEngine: react
composes: []
package: '@factory/ui'
registryItem: '@factory/empty-state'
figmaNode: null
tokens:
  - empty-state.title.text
  - empty-state.title.typography
  - empty-state.description.text
  - empty-state.description.typography
  - empty-state.error.text
  - empty-state.gap
props: ./empty-state.props.ts
dataContract: null
a11y:
  {
    role: 'status for empty/filtered; alert for error',
    keyboard: 'Tab reaches the action button',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 0.8 }
tests: [unit, a11y, visual]
references:
  - 'https://ui.shadcn.com/docs/components/empty'
  - 'https://www.w3.org/WAI/ARIA/apg/practices/structural-roles/'
adr: [ADR-003]
source:
  - src/components/ui/empty-state.tsx
---

# Empty state

## Purpose

One answer to "why is there nothing here?" for every panel and engine. **Use it** when a panel
has no rows, its filters exclude everything, or it failed. **Don't** let an engine draw empty
axes.

## Anatomy

```
① icon slot (waits for the Icon atom, P2; not built)
② Nothing matches these filters
③ Try fewer regions.
④ [ Clear filters ]
```

## Props and variants

`EmptyStateProps { variant, title, description?, action?, size? }`.

| Variant  | Meaning                   | Role   | Typical action |
| -------- | ------------------------- | ------ | -------------- |
| empty    | the dataset has no rows   | status | none           |
| filtered | filters exclude every row | status | Clear filters  |
| error    | load or render failed     | alert  | Retry          |

`size: compact` (KPI cells): text only.

## States

The variants are the states. No hover or focus of its own (the action is a Button).

## Token map

Text `panel.status.text`; error title `panel.status.error`; type `panel.status.typography` /
`typography.body`; new `empty-state.title.typography`, `empty-state.icon.color` (→ `color.text.muted`).

## Data binding and formatting

The chart panel decides the variant: zero rows before filters → `empty`; zero after filters →
`filtered`; thrown error → `error`.

## Responsive and density

Centred in the panel body; `compact` below ~120 px height.

## Accessibility

`role="status"` (polite) for empty/filtered so a filter change is announced; `role="alert"` for
errors. The KPI em dash keeps its sr-only "no data".

## Motion

None.

## Dependencies and bundle

None of its own. Callers pass a Button as `action`; the icon slot waits for the Icon atom (P2).

## Test plan

- **unit:** variant choice from row counts. **a11y:** roles announce. **visual:** each variant in a
  KPI-sized and a chart-sized cell.

## Open questions

None.
