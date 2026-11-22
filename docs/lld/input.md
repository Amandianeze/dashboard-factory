---
id: input
name: Input
summary: Single-line text entry.
atomicLevel: atom
biLevel: null
status: proposed
renderEngine: react
gap:
  priority: P2
  reason: 'No text input. Field, SearchBox and every CRUD form need one.'
package: '@factory/ui'
registryItem: '@factory/input'
figmaNode: null
tokens:
  [
    color.bg.surface,
    color.text.primary,
    color.text.muted,
    color.border.control,
    color.status.danger,
    color.focus.ring,
    typography.body,
    space.inset.control-x,
    space.inset.control-y,
  ]
newTokens:
  [
    input.bg,
    input.text,
    input.placeholder,
    input.border,
    input.border.invalid,
    input.radius,
    input.padding.x,
    input.padding.y,
    input.disabled.bg,
  ]
props: ./input.props.ts
dataContract: null
a11y: { role: 'textbox (native input)', keyboard: native, srSummary: n/a, minContrast: 4.5 }
motion: null
perfBudget: { renderMs: 0.3, bundleKb: 0.8 }
tests: [unit, interaction, a11y, visual]
references:
  - 'https://base-ui.com/react/components/input'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'
adr: [ADR-003]
---

# Input

## Purpose

Free text entry. **Use it** inside a [field](field.md) (which supplies the label and errors).
**Don't use it** alone without a label, or for choices from a known list (select).

## Anatomy

```
[ ① placeholder / value                ]
```

## Props and variants

`InputProps` extends the native input attributes with `invalid?`. `type`: text, search, email,
number, url, tel, password.

## States

Default, hover, focus-visible, disabled, read-only, invalid (`aria-invalid`, danger border).
Placeholder is a hint, never the label.

## Token map

New `input.*` tokens: `input.border` → `color.border.control` (≥ 3:1), `input.border.invalid` →
`color.status.danger`, `input.placeholder` → `color.text.muted` (≥ 4.5:1), padding →
`space.inset.control-*`, focus → `color.focus.ring`.

## Data binding and formatting

Controlled or uncontrolled; number inputs keep the raw string until submit.

## Responsive and density

Fills its field. Font ≥ 16 px on touch to stop iOS zoom (typography.body).

## Accessibility

Native input via Base UI `Input`; name from the Field label; `aria-invalid` and
`aria-describedby` set by Field.

## Motion

None.

## Dependencies and bundle

`@base-ui/react`.

## Test plan

- **interaction:** typing, disabled. **a11y:** labelled through Field. **visual:** states.

## Open questions

None.
