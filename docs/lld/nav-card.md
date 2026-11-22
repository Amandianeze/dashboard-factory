---
id: nav-card
name: Navigation card
summary: Index-page link to one dashboard, listing its validation errors.
atomicLevel: molecule
biLevel: null
status: beta
renderEngine: react
composes: []
source:
  - src/components/ui/nav-card.tsx
  - src/styles.css
package: '@factory/ui'
registryItem: '@factory/nav-card'
figmaNode: null
tokens:
  - nav-card.bg
  - nav-card.border
  - nav-card.hover.border
  - nav-card.radius
  - nav-card.padding
  - border-width.hairline
  - typography.heading
  - typography.body
  - typography.caption
  - color.text.primary
  - color.text.muted
  - panel.status.error
props: ./nav-card.props.ts
dataContract: null
a11y:
  {
    role: 'listitem containing one link',
    keyboard: 'Tab to the card link; Enter opens',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 0.5 }
tests: [a11y, visual, break-ui]
references:
  - 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html'
adr: []
---

# Navigation card

## Purpose

One dashboard on the index page: title, description and spec file, or the spec's validation
errors. **Use it** in link grids. **Don't use it** as a panel (panel-frame).

## Anatomy

```
┌ li ─────────────────────┐
│ ① h2 title (link)       │
│ ② description           │
│ ③ file.dashboard.yaml   │  or  ④ error list
└─────────────────────────┘
```

## Props and variants

`NavCardProps { href?, title, description?, file, errors? }`. With `errors` it is not a link.

## States

Default; hover and focus-visible (none today: only the browser default link focus); error (lists
validation errors in `panel.status.error`).

## Token map

Its own `nav-card.*` tokens since Phase 5 (Gate 3 deprecation 1 retired): they alias the panel
tokens, so nothing looks different, plus a hover and focus-within border (`nav-card.hover.border`).

## Data binding and formatting

From the validated spec list.

## Responsive and density

Auto-fill grid, minimum `layout.card.min-width`.

## Accessibility

The whole card is one link whose name is the title; the description is part of the link text.
Errors are a list.

## Motion

None.

## Dependencies and bundle

None.

## Test plan

- **a11y:** one link per card. **break-ui:** 15 errors, 200-character description.

## Open questions

None.
