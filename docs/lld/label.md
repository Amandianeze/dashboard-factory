---
id: label
name: Label
summary: Text that names a control.
atomicLevel: atom
biLevel: null
status: proposed
renderEngine: react
gap:
  priority: P2
  reason: 'Filters use fieldset legends and inline text; forms need a Label atom.'
package: '@factory/ui'
registryItem: '@factory/label'
figmaNode: null
tokens: [typography.label, color.text.primary, color.text.muted]
newTokens: [label.typography, label.text, label.required.text]
props: ./label.props.ts
dataContract: null
a11y:
  {
    role: 'label (native)',
    keyboard: 'clicking focuses the control',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.1, bundleKb: 0.2 }
tests: [unit, a11y]
references:
  - 'https://www.w3.org/WAI/tutorials/forms/labels/'
  - 'https://ui.shadcn.com/docs/components/label'
adr: [ADR-003]
---

# Label

## Purpose

Names a form control. **Use it** through Field. **Don't** use placeholder text as a label.

## Anatomy

```
① Email  ② (required)
```

## Props and variants

`LabelProps { htmlFor, required?, children }`.

## States

Default; disabled follows the control (muted).

## Token map

New `label.typography` (→ `typography.label`), `label.text` (→ `color.text.primary`),
`label.required.text` (→ `color.text.muted`).

## Data binding and formatting

None.

## Responsive and density

Above the control; wraps.

## Accessibility

Native `label for`. "Required" is text, not only an asterisk.

## Motion

None.

## Dependencies and bundle

None.

## Test plan

- **a11y:** every control has a name.

## Open questions

None.
