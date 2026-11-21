---
id: badge
name: Badge
summary: Short status text with a status colour, e.g. an order status.
atomicLevel: atom
biLevel: object
status: proposed
renderEngine: react
gap:
  priority: P1
  reason: 'Gate 2 gap: no status badge (order status). Must pair colour with text, never colour alone.'
package: '@factory/ui'
registryItem: '@factory/badge'
figmaNode: null
tokens:
  [
    color.status.danger,
    color.status.warning,
    color.status.success,
    color.status.info,
    color.text.primary,
    color.bg.surface-raised,
    radius.pill,
    typography.caption,
  ]
newTokens:
  [
    badge.neutral.bg,
    badge.neutral.text,
    badge.info.bg,
    badge.info.text,
    badge.success.bg,
    badge.success.text,
    badge.warning.bg,
    badge.warning.text,
    badge.danger.bg,
    badge.danger.text,
    badge.radius,
    badge.padding.x,
    badge.padding.y,
    badge.typography,
  ]
props: ./badge.props.ts
dataContract: null
a11y:
  {
    role: 'text (no role); the text carries the status',
    keyboard: 'n/a',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 0.2, bundleKb: 0.5 }
tests: [unit, a11y, visual]
references:
  - 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html'
  - 'https://ui.shadcn.com/docs/components/badge'
adr: [ADR-003]
---

# Badge

## Purpose

Shows a status in a word: Shipped, Pending, Failed. **Use it** in table cells and detail
headers. **Don't use it** as a button or filter (not interactive), or for numbers (formatted-value).

## Anatomy

```
( ① icon? ② Shipped )
```

## Props and variants

`BadgeProps { tone?, children, icon? }`. `tone`: neutral · info · success · warning · danger
(default neutral).

## States

Default only; not interactive. **Overflow:** single line, ellipsis with the full text in `title`
is **not** allowed (mouse-only); keep status words short.

## Token map

New `badge.<tone>.bg/text` tokens: tinted backgrounds from `color.status.*` with text that
reaches 4.5:1 on the tint in every theme (checked by `tokens:validate` once added).
Shape: `badge.radius` → `radius.pill`; type `badge.typography` → `typography.caption`.

## Data binding and formatting

A data-table column maps values to tones (e.g. `{ shipped: success, failed: danger }`), decided
in the data-table column spec.

## Responsive and density

Intrinsic. Compact density reduces padding.

## Accessibility

The text says the status, so colour is never the only signal (WCAG 1.4.1). Icons are decorative.

## Motion

None.

## Dependencies and bundle

None beyond `cva`.

## Test plan

- **a11y:** contrast per tone per theme. **visual:** tone matrix, light/dark/hc.

## Open questions

None.
