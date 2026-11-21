---
id: filter-bar
name: Filter bar
summary: The dashboard filters, as chip groups and selects.
atomicLevel: organism
biLevel: pattern
status: beta
renderEngine: react
composes: [filter-chip, select]
source: [src/dashboard/FilterBar.tsx]
package: '@factory/panels'
registryItem: '@factory/filter-bar'
figmaNode: null
tokens: [filter.gap, filter.label.text, filter.label.gap, space.grid.gap, chip.typography]
newTokens: []
props: ./filter-bar.props.ts
dataContract: src/spec/schema.ts#FilterSpec
a11y:
  {
    role: 'group "Filters"; each filter a fieldset/legend or labelled select',
    keyboard: 'Tab between controls; Space/Enter toggles a chip; arrows in a select',
    srSummary: n/a,
    minContrast: 4.5,
  }
motion: null
perfBudget: { renderMs: 2, bundleKb: 1 }
tests: [unit, interaction, a11y, visual, break-ui]
references:
  - 'https://www.w3.org/WAI/ARIA/apg/patterns/button/'
  - 'https://www.w3.org/WAI/tutorials/forms/grouping/'
adr: [ADR-003]
---

# Filter bar

## Purpose

The slicer pattern: lets people narrow every panel a filter applies to. **Use it** for
dashboard-level filters declared in the spec. **Don't use it** for cross-panel brushing (roadmap)
or for a filter inside one panel.

## Anatomy

```
[Region: (North) (South)● (East) (Clear)]   [Product: ▾ All      ]
 ① legend  ② filter-chip …       ③ clear     ④ select
```

## Props and variants

`FilterBarProps { filters, data, state, onChange }`. Per filter `type`: `multiselect` → chip
group; `select` → native select with an "All" option. Renders nothing when there are no filters.

## States

- Chip states (default, hover, pressed, selected, focus, disabled): see [filter-chip](filter-chip.md).
- **Empty options:** a filter whose field has no values renders only its legend. Should hide or say so.
- **Overflow:** chips wrap; 200 distinct values would produce 200 chips (needs a select or search).

## Token map

| Part            | Property    | Token                                   |
| --------------- | ----------- | --------------------------------------- |
| Between filters | gap         | `space.grid.gap`                        |
| Between chips   | gap         | `filter.gap`                            |
| Legend / label  | colour, gap | `filter.label.text`, `filter.label.gap` |
| Text            | font        | `chip.typography`                       |

## Data binding and formatting

Options are `distinctValues(data[dataset], field)` from **unfiltered** rows, in first-seen order.
State is `{ [filterId]: string[] }`; empty means all. Values show raw (no formats).

## Responsive and density

Wraps; below the stack breakpoint each filter takes a line.

## Accessibility

`role="group"` with `aria-label="Filters"`; multiselects are `fieldset` + `legend`; chips are
toggle buttons (`aria-pressed`). Clear is a button but styled as a chip (Gate 3 deprecation 2 →
button `ghost`).

## Motion

None.

## Dependencies and bundle

None beyond React.

## Test plan

- **interaction:** toggle, clear, select All; state shape.
- **a11y:** names, pressed state, keyboard toggling.
- **break-ui:** 200 options, 60-character values, a filter with no values.

## Open questions

1. Above how many options does a multiselect switch to a searchable select? Owner: design review.
