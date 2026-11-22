---
id: select
name: Select
summary: Native single-choice dropdown, styled as a pill.
atomicLevel: atom
biLevel: null
status: beta
renderEngine: react
composes: []
source:
  - src/components/ui/select.tsx
  - src/dashboard/FilterBar.tsx
package: '@factory/ui'
registryItem: '@factory/select'
figmaNode: null
tokens:
  [
    chip.bg,
    chip.text,
    chip.border,
    chip.radius,
    chip.padding.x,
    chip.padding.y,
    chip.typography,
    chip.hover.bg,
    chip.hover.border,
    chip.hover.text,
    chip.disabled.bg,
    chip.disabled.text,
    chip.disabled.border,
    chip.focus.ring,
    chip.focus.width,
    chip.focus.offset,
    filter.label.text,
  ]
newTokens: [select.bg, select.border, select.text]
props: ./select.props.ts
dataContract: null
a11y:
  {
    role: 'native select (combobox) inside its label',
    keyboard: 'native: arrows, type-ahead, Enter/Space opens',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 0.3 }
tests: [interaction, a11y, visual]
references:
  - 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select'
  - 'https://www.w3.org/WAI/tutorials/forms/labels/'
adr: [ADR-003]
---

# Select

## Purpose

Pick one value from a list. Native on purpose (ADR-003, decision 3): keyboard, mobile pickers and
screen readers for free. **Use it** for single-choice filters and form fields. **Don't use it**
for multiple choice (filter chips) or when the list needs search (a Base UI select, later).

## Anatomy

```
① label  [ ② All          ▾ ]
```

## Props and variants

`SelectProps { label, options, value, onChange, allLabel?, disabled? }`. Today inlined in
`FilterBar`.

## States

Default, hover, focus-visible, disabled (all `chip.*` today, shared with filter chips). Invalid
state comes with Field.

## Token map

Borrows `chip.*` today. Gets `select.*` aliases (front matter `newTokens`) so the chip can change
without moving selects.

## Data binding and formatting

Options are strings; "All" maps to `null`.

## Responsive and density

Intrinsic width. Compact density shrinks padding.

## Accessibility

Wrapped in its `label`. Border contrast ≥ 3:1 (control boundary, WCAG 1.4.11).

## Motion

None.

## Dependencies and bundle

None.

## Test plan

- **interaction:** choose, back to All. **a11y:** labelled. **visual:** states.

## Open questions

None.
