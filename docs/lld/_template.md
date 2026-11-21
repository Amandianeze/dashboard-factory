---
# Copy to docs/lld/<id>.md. Field rules: scripts/catalog/schema.ts. Check: npm run lld:check.
id: example-item # kebab-case; equals the file name
name: Example item
summary: One sentence an agent reads in catalog.json to decide whether this is what it needs.
atomicLevel: molecule # atom | molecule | organism | template (pages are specs, not items)
biLevel: null # object | pattern | visual | page-template | report-template | null (UI only)
status: proposed # proposed | beta | stable | deprecated (ADR-005)
renderEngine: react # react | flint | vega-lite | d3 | plotly
composes: [] # catalog ids it is built from today (down the ladder only)
source: [] # files that implement it; empty while proposed
# panel: { renderers: [] } # organisms only: makes this a dashboard `kind`
gap: { priority: P2, reason: Why it is needed, from a real screen or review. } # proposed only
package: '@factory/ui' # @factory/ui | @factory/panels | @factory/format (ADR-004)
registryItem: '@factory/example-item'
figmaNode: null # Code Connect node, once a Figma file exists
tokens: [color.text.primary] # existing semantic/component/density/motion tokens only
newTokens: [example.bg] # tokens it needs that don't exist yet
props: ./example-item.props.ts # null only for engine-drawn items (legend, axis)
dataContract: null # 'path#ZodExport' when the item binds data
a11y: { role: group, keyboard: n/a, srSummary: n/a, minContrast: 4.5 }
motion: null # { enter, reducedMotion } once Phase 6 designs it
perfBudget: { renderMs: 4, bundleKb: 2 }
tests: [unit, a11y, visual]
references: ['https://atomicdesign.bradfrost.com/chapter-2/']
adr: [ADR-003]
---

# Example item

## Purpose

What job it does, in two or three sentences. **Use it when** … **Don't use it when** … (and
what to use instead, by catalog id).

## Anatomy

A labelled outline of the parts, e.g.

```
┌ root ─────────────────────┐
│ ① label   ② value  ③ icon │
└───────────────────────────┘
```

## Props and variants

The interface lives in `./<id>.props.ts`. Summarise the props and the `cva` variants:

| Variant | Values | Default |
| ------- | ------ | ------- |

## States

Default, hover, focus, active/pressed, disabled, loading, empty, error, overflow. Say which apply
and how each looks (by token), and which don't apply and why.

## Token map

| Part | Property | Token |
| ---- | -------- | ----- |

## Data binding and formatting

What data it takes, the contract (`dataContract`), and where formats come from (format tokens
or dataset semantics). "None" for pure UI.

## Responsive and density

Behaviour below the stack breakpoint and in compact density.

## Accessibility

Role, keyboard map (key → action), accessible name and description, contrast, the text
alternative for anything visual.

## Motion

None, or what moves, its duration/easing tokens, and the reduced-motion behaviour.

## Dependencies and bundle

Runtime dependencies (with ADR), what it adds to the bundle, and how it is loaded.

## Test plan

Unit, interaction, a11y, visual and break-ui cases (long text, 10⁹ values, zero rows, 10k rows,
RTL, missing data) that apply.

## Open questions

Decisions still needed, with an owner. "None" if none.
