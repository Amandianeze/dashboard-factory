---
id: title-band
name: Title band
summary: Page heading and description.
atomicLevel: molecule
biLevel: pattern
status: beta
renderEngine: react
composes: []
source:
  - src/components/ui/title-band.tsx
package: '@factory/ui'
registryItem: '@factory/title-band'
figmaNode: null
tokens:
  [
    page.title.typography,
    page.title.color,
    page.description.typography,
    page.description.color,
    page.description.gap,
  ]
newTokens: []
props: ./title-band.props.ts
dataContract: null
a11y: { role: 'header with the page h1', keyboard: 'n/a', srSummary: n/a, minContrast: 4.5 }
motion: null
perfBudget: { renderMs: 1, bundleKb: 0.5 }
tests: [a11y, visual, break-ui]
references:
  - 'https://www.w3.org/WAI/tutorials/page-structure/headings/'
adr: []
---

# Title band

## Purpose

Names the page and says who it is for. The SQLBI "title band" pattern. **Use it** once per page,
at the top. **Don't use it** for panel titles (panel-frame) or section headings.

## Anatomy

```
① h1 title
② description (muted)
```

## Props and variants

`TitleBandProps { title, description? }`. Today inlined in `DashboardView` and the index page
(`.dashboard-header`).

## States

Default only. **Overflow:** long titles wrap; no truncation.

## Token map

| Part        | Property          | Token                                       |
| ----------- | ----------------- | ------------------------------------------- |
| Title       | font, colour      | `page.title.typography`, `page.title.color` |
| Description | font, colour, gap | `page.description.*`                        |

## Data binding and formatting

Static text from the spec (`title`, `description`).

## Responsive and density

Wraps; no change by density.

## Accessibility

The only h1 on the page. Description is plain text, read after the heading.

## Motion

None.

## Dependencies and bundle

None.

## Test plan

- **a11y:** one h1. **visual:** page baselines. **break-ui:** 120-character title, empty description.

## Open questions

None.
