---
id: field
name: Field
summary: Label, control, help text and error message as one unit.
atomicLevel: molecule
biLevel: null
status: proposed
renderEngine: react
composes: [label, input]
gap:
  priority: P2
  reason: 'CRUD and settings forms need label + input + help + error.'
package: '@factory/ui'
registryItem: '@factory/field'
figmaNode: null
tokens: [typography.caption, color.text.muted, color.text.danger, space.stack.xs]
newTokens: [field.gap, field.help.text, field.error.text]
props: ./field.props.ts
dataContract: null
a11y:
  {
    role: 'group of label + control; error announced',
    keyboard: 'native control behaviour',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.5, bundleKb: 1 }
tests: [unit, interaction, a11y, visual]
references:
  - 'https://base-ui.com/react/components/field'
  - 'https://ui.shadcn.com/docs/components/field'
  - 'https://www.w3.org/WAI/tutorials/forms/notifications/'
adr: [ADR-003]
---

# Field

## Purpose

Wires a label, a control, help and an error together so every form field is accessible the same
way. **Use it** around every form control. **Don't use it** for filter-bar controls (they have
their own compact labels).

## Anatomy

```
① Label (required)
② [ control                 ]
③ help text
④ ⚠ error message
```

## Props and variants

`FieldProps { id?, label, children, help?, error?, required? }`. Built on Base UI `Field`.

## States

Default, focus (from the control), invalid (error shown, control `aria-invalid`), disabled.

## Token map

New `field.gap` (→ `space.stack.xs`), `field.help.text` (→ `color.text.muted`),
`field.error.text` (→ `color.text.danger`); text `typography.caption`.

## Data binding and formatting

None of its own; the form owns values and validation.

## Responsive and density

Stacked; full width of its column.

## Accessibility

Control gets `id`, `aria-describedby` (help, error) and `aria-invalid`. Errors are text with an
icon, announced when they appear (`aria-live` polite on the message).

## Motion

None.

## Dependencies and bundle

Base UI `Field`; Label; Input or another control.

## Test plan

- **a11y:** describedby includes help and error. **interaction:** error appears and is announced.

## Open questions

None.
