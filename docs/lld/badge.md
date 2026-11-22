---
id: badge
name: Badge
summary: Short status text with a status colour, e.g. an order status.
atomicLevel: atom
biLevel: object
status: beta
renderEngine: react
package: '@factory/ui'
registryItem: '@factory/badge'
figmaNode: null
tokens:
  - badge.bg
  - badge.border
  - badge.text
  - badge.neutral.dot
  - badge.info.dot
  - badge.success.dot
  - badge.warning.dot
  - badge.danger.dot
  - badge.radius
  - badge.padding.x
  - badge.padding.y
  - badge.gap
  - badge.dot-size
  - badge.typography
  - border-width.hairline
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
source:
  - src/components/ui/badge.tsx
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

Built (Phase 5) as a neutral pill with a status-coloured dot: `badge.bg` (→
`color.bg.surface-raised`), `badge.border`, `badge.text` (→ `color.text.primary` for every tone),
and `badge.<tone>.dot` (→ `color.status.*`). Status-coloured text was tried first and failed
`tokens:validate` (info 3.22:1 in dark, warning 5.43:1 against the 7:1 high-contrast rule), so
the word carries the meaning and the dot carries the colour. Shape `badge.radius` → `radius.pill`;
type `badge.typography` → `typography.caption`.

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
