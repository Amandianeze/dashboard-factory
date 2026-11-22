---
id: skeleton
name: Skeleton
summary: Placeholder shape shown while data loads.
atomicLevel: atom
biLevel: null
status: proposed
renderEngine: react
gap:
  priority: P2
  reason: "Loading is a 'Loading data…' line and panels pop in."
package: '@factory/ui'
registryItem: '@factory/skeleton'
figmaNode: null
tokens: [color.bg.pressed, radius.mark, motion.duration.slow, motion.easing.in-out]
newTokens: [skeleton.bg, skeleton.radius, skeleton.line-height]
props: ./skeleton.props.ts
dataContract: null
a11y:
  {
    role: 'presentation inside a container with aria-busy=true',
    keyboard: 'n/a',
    srSummary: n/a,
    minContrast: 3,
  }
motion:
  {
    enter: 'opacity pulse, motion.duration.slow, motion.easing.in-out, infinite',
    reducedMotion: 'static shape, no pulse',
  }
perfBudget: { renderMs: 0.3, bundleKb: 0.3 }
tests: [unit, a11y, visual]
references:
  - 'https://ui.shadcn.com/docs/components/skeleton'
  - 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html'
adr: [ADR-003]
---

# Skeleton

## Purpose

Holds the shape of content while it loads, so the page doesn't jump. **Use it** per panel while
its dataset or engine chunk loads. **Don't use it** for under ~300 ms waits (show nothing) or for
errors.

## Anatomy

```
kpi:   ▭▭▭▭▭▭        chart: ▭▭▭▭▭▭▭▭▭▭▭▭ (body-sized block)
text:  ▭▭▭▭▭▭▭▭▭       table: ▭▭▭ ▭▭▭▭▭ ▭▭  × count
```

## Props and variants

`SkeletonProps { variant, count? }`. Presets only, so callers never pass raw sizes.

## States

Loading only.

## Token map

New `skeleton.bg` (→ `color.bg.pressed`), `skeleton.radius` (→ `radius.mark`),
`skeleton.line-height`. Pulse uses `motion.duration.slow` / `motion.easing.in-out`.

## Data binding and formatting

None.

## Responsive and density

Fills the panel body; table rows follow the density row height.

## Accessibility

Shapes are hidden from screen readers; the panel sets `aria-busy="true"` while loading and a
polite status says "Loading revenue" once.

## Motion

A slow opacity pulse; stops with `prefers-reduced-motion`, and stops after 5 s anyway (WCAG 2.2.2
needs a way to stop motion lasting over 5 s).

## Dependencies and bundle

None.

## Test plan

- **a11y:** aria-busy toggles. **visual:** each preset; reduced-motion snapshot.

## Open questions

None.
