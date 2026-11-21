---
id: filter-chip
name: Filter chip
summary: Toggle chip (aria-pressed) for one value of a multiselect filter.
atomicLevel: molecule
biLevel: pattern
status: beta
renderEngine: react
composes: []
source: [src/dashboard/FilterBar.tsx, src/styles.css]
package: '@factory/panels'
registryItem: '@factory/filter-chip'
figmaNode: null
tokens:
  - chip.bg
  - chip.text
  - chip.border
  - chip.radius
  - chip.padding.x
  - chip.padding.y
  - chip.typography
  - chip.hover.bg
  - chip.hover.text
  - chip.hover.border
  - chip.pressed.bg
  - chip.pressed.text
  - chip.selected.bg
  - chip.selected.text
  - chip.selected.border
  - chip.selected.hover.bg
  - chip.selected.hover.text
  - chip.disabled.bg
  - chip.disabled.text
  - chip.disabled.border
  - chip.focus.ring
  - chip.focus.width
  - chip.focus.offset
newTokens: []
props: ./filter-chip.props.ts
dataContract: null
a11y:
  {
    role: 'button with aria-pressed',
    keyboard: 'Space or Enter toggles; Tab moves between chips',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 0.5 }
tests: [interaction, a11y, visual]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/patterns/button/'
  - 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'
adr: [ADR-003]
---

# Filter chip

## Purpose

One selectable value in a multiselect filter. **Use it** for a few (≤ ~12) values. **Don't use
it** as a general button (→ [button](button.md); the Clear chip is Gate 3 deprecation 2) or for
long value lists (→ a searchable select).

## Anatomy

```
( North )   ( South● )
 ① text      selected: filled with the accent
```

## Props and variants

`FilterChipProps { label, pressed, onPressedChange, disabled? }`. One variant; state is the
variant. Today inlined in `FilterBar` as `button.chip`.

## States

Default, hover, pressed (active), selected (`aria-pressed=true`), selected + hover, focus-visible
(ring), disabled. Loading, empty, error: n/a.

## Token map

All `chip.*` tokens in the front matter: base, `hover`, `pressed`, `selected`, `selected.hover`,
`disabled`, `focus`. The control border is ≥ 3:1 against the surface (fixed in Phase 1; Gate 0
measured 1.27:1).

## Data binding and formatting

The label is the raw field value.

## Responsive and density

Wraps within the filter. Compact density shrinks padding via `space.inset.control-*`.

## Accessibility

Toggle button pattern: `aria-pressed` conveys selection, so colour is not the only signal. Name =
visible text. Focus ring `chip.focus.*` with offset.

## Motion

None (state changes are instant; nothing animates on keyboard actions).

## Dependencies and bundle

None. Base UI `Toggle` could replace it later; native `button` + `aria-pressed` is enough.

## Test plan

- **interaction:** click, Space, Enter toggle. **a11y:** pressed state announced.
- **visual:** every state in Storybook (Phase 5).

## Open questions

None.
