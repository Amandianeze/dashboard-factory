---
id: button
name: Button
summary: Triggers an action; primary, secondary and ghost variants.
atomicLevel: atom
biLevel: null
status: proposed
renderEngine: react
gap:
  priority: P1
  reason: 'No button atom: the clear-filters control is a styled chip. Product UI (forms, CRUD) needs primary, secondary and ghost buttons.'
package: '@factory/ui'
registryItem: '@factory/button'
figmaNode: null
tokens:
  [
    color.bg.accent,
    color.bg.accent-hover,
    color.text.on-accent,
    color.bg.surface,
    color.bg.pressed,
    color.text.primary,
    color.border.control,
    color.focus.ring,
    radius.pill,
    typography.body-strong,
    space.inset.control-x,
    space.inset.control-y,
  ]
newTokens:
  [
    button.primary.bg,
    button.primary.text,
    button.primary.hover.bg,
    button.secondary.bg,
    button.secondary.border,
    button.ghost.text,
    button.pressed.bg,
    button.disabled.bg,
    button.disabled.text,
    button.focus.ring,
    button.radius,
    button.padding.x,
    button.padding.y,
    button.typography,
  ]
props: ./button.props.ts
dataContract: null
a11y:
  {
    role: button,
    keyboard: 'Enter and Space activate; disabled buttons stay focusable only when they explain why (aria-disabled)',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 1.5 }
tests: [unit, interaction, a11y, visual]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/patterns/button/'
  - 'https://base-ui.com/react/components/button'
  - 'https://ui.shadcn.com/docs/components/button'
adr: [ADR-003]
---

# Button

## Purpose

Runs an action. **Use it** for commands (Apply, Clear, Retry, Save). **Don't use it** for
navigation (a link), for toggling a filter value ([filter-chip](filter-chip.md)), or with an icon
and no text unless it has an `aria-label` and a Tooltip.

## Anatomy

```
[ ① icon  ② label ]   ③ focus ring outside the border
```

## Props and variants

`ButtonProps` (`./button.props.ts`). `cva` variants:

| Variant   | Values                      | Default   |
| --------- | --------------------------- | --------- |
| `variant` | primary · secondary · ghost | secondary |
| `size`    | sm · md                     | md        |

`type` defaults to `button`. `loading` keeps the width and sets `aria-busy`.

## States

Default, hover, focus-visible, active/pressed, disabled, loading. Empty, error, overflow: label
wraps never; long labels are a content bug.

## Token map

New component tokens (front matter `newTokens`), aliasing today's semantics:
`button.primary.*` → `color.bg.accent` / `accent-hover` / `color.text.on-accent`;
`button.secondary.*` → `color.bg.surface` + `color.border.control`; `button.ghost.text` →
`color.text.primary`; `button.radius` → `radius.pill`; padding → `space.inset.control-*`;
focus → `color.focus.ring`.

## Data binding and formatting

None.

## Responsive and density

Intrinsic width; compact density uses the compact control insets. Touch targets ≥ 24×24 px
(WCAG 2.5.8).

## Accessibility

Native `button` via Base UI `Button`. Name = visible text. Disabled-with-reason uses
`aria-disabled` + Tooltip instead of `disabled`, so it stays focusable.

## Motion

None (hover/press colour changes are instant; nothing animates on keyboard actions).

## Dependencies and bundle

`@base-ui/react` (ADR-003), `class-variance-authority` for variants. ~1.5 kB gzip.

## Test plan

- **interaction:** click, Enter, Space; `loading` ignores clicks. **a11y:** axe; focus ring visible.
- **visual:** variant × size × state matrix in Storybook.

## Open questions

1. A `danger` variant for destructive CRUD actions, or a confirm dialog only? Owner: design review.
