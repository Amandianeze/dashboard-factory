---
id: icon
name: Icon
summary: One glyph from the icon set.
atomicLevel: atom
biLevel: object
status: proposed
renderEngine: react
gap:
  priority: P2
  reason: 'No icon set (ADR-003 picks one). Badge, EmptyState, Button and the delta indicator need it.'
package: '@factory/ui'
registryItem: '@factory/icon'
figmaNode: null
tokens: [typography.caption, typography.body, typography.heading]
newTokens: [icon.size.sm, icon.size.md, icon.size.lg, icon.stroke-width]
props: ./icon.props.ts
dataContract: null
a11y:
  {
    role: 'img with aria-label when meaningful; aria-hidden when decorative',
    keyboard: 'n/a',
    srSummary: n/a,
    minContrast: 3,
  }
motion: null
perfBudget: { renderMs: 0.1, bundleKb: 0.5 }
tests: [unit, a11y, visual]
references:
  - 'https://lucide.dev/guide/packages/lucide-react'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'
adr: [ADR-003]
---

# Icon

## Purpose

The one wrapper around the icon set (Lucide, ADR-003), so sizing, colour and accessibility are
consistent and the set can be swapped in one place. **Don't** import `lucide-react` directly in
components.

## Anatomy

```
① svg (currentColor, stroke icon.stroke-width) sized icon.size.*
```

## Props and variants

`IconProps { icon, size?, label? }`. `size`: sm · md · lg, matched to caption, body and heading
line heights.

## States

Default only.

## Token map

New `icon.size.{sm,md,lg}` (from the type scale) and `icon.stroke-width`. Colour is
`currentColor`, so it follows the surrounding text token.

## Data binding and formatting

None.

## Responsive and density

Fixed by size; compact density keeps icon sizes.

## Accessibility

Decorative by default (`aria-hidden`); with `label` it becomes `role="img"` + `aria-label`.
Meaningful icons need 3:1 against their background.

## Motion

None.

## Dependencies and bundle

`lucide-react`, imported per icon (tree-shaken, ~0.3–0.5 kB each).

## Test plan

- **unit:** aria attributes for both modes. **visual:** sizes alongside text.

## Open questions

None.
