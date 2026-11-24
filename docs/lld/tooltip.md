---
id: tooltip
name: Tooltip
summary: Extra text shown on hover and keyboard focus.
atomicLevel: atom
biLevel: null
status: beta
renderEngine: react
package: '@factory/ui'
registryItem: '@factory/tooltip'
figmaNode: null
tokens:
  - tooltip.bg
  - tooltip.text
  - tooltip.border
  - tooltip.radius
  - tooltip.padding.x
  - tooltip.padding.y
  - tooltip.max-width
  - tooltip.offset
  - tooltip.typography
  - motion.duration.base
  - motion.duration.fast
  - motion.easing.out
  - border-width.hairline
props: ./tooltip.props.ts
dataContract: null
a11y:
  {
    role: 'tooltip (aria-describedby from the trigger)',
    keyboard: 'shows on focus; Escape dismisses; hoverable (WCAG 1.4.13)',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion:
  {
    enter: 'fade 120ms motion.easing.out after tooltip.delay; in a TooltipGroup, neighbours open at once without the fade',
    reducedMotion: 'appear without fade',
  }
perfBudget: { renderMs: 1, bundleKb: 4 }
tests: [interaction, a11y, visual]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html'
  - 'https://base-ui.com/react/components/tooltip'
adr: [ADR-003]
source:
  - src/components/ui/tooltip.tsx
---

# Tooltip

## Purpose

Supplementary text for a control or an info icon: panel descriptions, icon-only button names,
why something is disabled. **Don't use it** for essential information (put it on the page), for
interactive content (a popover), or for chart data tips (the engines handle those).

## Anatomy

```
 ⓘ ← ① trigger (focusable)
 ┌ ② popup ──────────────────┐
 │ Revenue after refunds …   │
 └───────────────────────────┘
```

## Props and variants

`TooltipProps { content, children, side? }`. Built on Base UI `Tooltip` (Provider, Trigger with
`render`, Positioner, Popup). `TooltipGroup` wraps the app once (Base UI `Tooltip.Provider` with the
same delay) so adjacent tooltips share it; a tooltip works without one.

## States

Closed, open (hover after delay, or focus immediately), dismissed (Escape). Not disabled itself.

## Token map

New `tooltip.*` tokens alias `color.bg.surface-raised`, `color.text.primary`,
`color.border.subtle`, `typography.caption`; `tooltip.max-width` keeps lines readable;
`tooltip.delay` is a motion token.

## Data binding and formatting

None.

## Responsive and density

Base UI positioner flips at viewport edges. On touch, a tap on the trigger toggles it.

## Accessibility

APG tooltip pattern: `aria-describedby`, shows on focus, Escape closes, hoverable and persistent
(WCAG 1.4.13). The trigger must be focusable (replaces `title=` on the panel h2). Base UI doesn't
wire the description, so the component does: the popup gets `role="tooltip"` and an id, the
trigger points `aria-describedby` at it, and the portal stays mounted (hidden while closed) so
the description is announced on focus even before, or without, the tooltip showing.

## Motion

Fade in after the delay with `motion.duration.fast` and `motion.easing.out`; no motion with
`prefers-reduced-motion`. Inside a `TooltipGroup`, once one tooltip has opened, moving to a
neighbour within 400 ms opens it at once and without the fade (`data-instant`): the first tooltip
earns the delay, the rest shouldn't re-ask. Phase 6 motion pass.

## Dependencies and bundle

Base UI Tooltip (~4 kB gzip incl. the positioner). Shared with other popups once added.

## Test plan

- **interaction:** hover delay, focus opens, Escape closes. **a11y:** describedby wiring, open and closed (`DescribesTrigger` story).
- **visual:** sides, long text.

## Open questions

None.
