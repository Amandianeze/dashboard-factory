---
id: panel-frame
name: Panel frame
summary: The card a panel sits in, with its title, body and an error boundary.
atomicLevel: molecule
biLevel: null
status: beta
renderEngine: react
composes:
  - tooltip
  - button
source:
  - src/components/panels/panel-frame.tsx
  - src/renderers/PanelRenderer.tsx
package: '@factory/panels'
registryItem: '@factory/panel-frame'
figmaNode: null
tokens:
  [
    panel.bg,
    panel.border.color,
    panel.border.width,
    panel.radius,
    panel.padding,
    panel.title.typography,
    panel.title.color,
    panel.title.gap,
    panel.status.error,
    panel.status.typography,
  ]
newTokens: []
props: ./panel-frame.props.ts
dataContract: null
a11y:
  {
    role: 'section with aria-labelledby → h2',
    keyboard: 'Tab to the description trigger and any header actions',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 1, bundleKb: 1 }
tests: [unit, a11y, visual]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html'
adr: [ADR-004]
---

# Panel frame

## Purpose

The container every panel shares: surface, border, title, body, and failure isolation so one
broken panel never takes down the page. **Use it** for every dashboard panel. **Don't use it**
for navigation cards (Gate 3 deprecation 1 → [nav-card](nav-card.md)) or for nested cards.

## Anatomy

```
┌ section.panel (span n, data-kind) ──┐
│ ① h2 title ② ⓘ description  ④ actions │
│ ③ body (flex 1) ← error boundary    │
└─────────────────────────────────────┘
```

## Props and variants

`PanelFrameProps { id, title, description?, kind, span, actions?, children }`. Today inlined in
`DashboardView` (markup) and `PanelErrorBoundary` (failure). No variants.

## States

- **Default:** surface with a hairline border.
- **Error:** the boundary prints "Panel failed to render: …" in `panel.status.error`
  (→ empty-state `error` with a Retry).
- **Description:** today `title=` on the h2, mouse-only (Gate 3 deprecation 3 → Tooltip on an ⓘ button).
- Hover, focus, disabled: n/a.

## Token map

| Part    | Property                   | Token                                           |
| ------- | -------------------------- | ----------------------------------------------- |
| Surface | background, border, radius | `panel.bg`, `panel.border.*`, `panel.radius`    |
| Inset   | padding                    | `panel.padding`                                 |
| Title   | font, colour, gap below    | `panel.title.*`                                 |
| Error   | font, colour               | `panel.status.typography`, `panel.status.error` |

## Data binding and formatting

None.

## Responsive and density

`grid-column: span var(--span)`; full width below the stack breakpoint. Compact density reduces
`panel.padding` through `space.inset.panel`.

## Accessibility

`section` with `aria-labelledby` the h2, so each panel is a named region. The description moves to
a Tooltip on a focusable ⓘ button (WCAG 1.4.13, 2.1.1).

## Motion

None.

## Dependencies and bundle

React only.

## Test plan

- **unit:** error boundary renders the error state.
- **a11y:** every panel is a named region; description reachable by keyboard (after the change).
- **visual:** covered by every panel baseline.

## Open questions

None.
