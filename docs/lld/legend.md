---
id: legend
name: Legend
summary: Chart legend drawn by the chart engine from the generated theme.
atomicLevel: molecule
biLevel: null
status: beta
renderEngine: vega-lite
composes: []
source: [scripts/tokens/engines.ts]
package: '@factory/panels'
registryItem: '@factory/legend'
figmaNode: null
tokens:
  [
    chart.label.typography,
    chart.label.text,
    chart.label.text-strong,
    chart.legend.gradient-length,
    chart.inset.top-legend,
  ]
newTokens: []
props: null
dataContract: null
a11y: { role: 'part of the chart image', keyboard: 'n/a', srSummary: n/a, minContrast: 4.5 }
motion: null
perfBudget: { renderMs: 1, bundleKb: 0 }
tests: [unit, visual]
references:
  - 'https://vega.github.io/vega-lite/docs/legend.html'
  - 'https://microsoft.github.io/flint-chart/'
adr: [ADR-002]
---

# Legend

## Purpose

Maps colours to series. One policy across engines (Gate 2): above the plot, left-aligned,
horizontal; continuous colour keys (heatmaps) beside the plot. **Use** direct labels instead when
there are ≤ 3 series and the ends of the lines are free (D3 ranked bars needs none).

## Anatomy

```
● North  ● South  ● East      (categorical, top)
▮▮▮▮▮▮ 0 … 1.2M               (gradient, right of a heatmap)
```

## Props and variants

None: no React component. Configured in `scripts/tokens/engines.ts` (`vegaLiteConfig`,
`flintTheme` incl. the `markChannel: color` variant, `plotlyTheme`) and generated into
`src/theme/generated/engines.ts`. Variants: symbol legend (top), gradient key (beside).

## States

Default only. **Overflow:** symbol legends wrap; many series (> 10) exceed the categorical palette.

## Token map

| Part             | Property     | Token                                        |
| ---------------- | ------------ | -------------------------------------------- |
| Labels           | font, colour | `chart.label.typography`, `chart.label.text` |
| Title            | colour       | `chart.label.text-strong`                    |
| Gradient         | length       | `chart.legend.gradient-length`               |
| Space above plot | inset        | `chart.inset.top-legend`                     |

## Data binding and formatting

The engine derives entries from the colour encoding; label formats follow the encoding's format.

## Responsive and density

Wraps with width. Flint heatmaps keep the key beside the plot (flint-chart 1.0.1 sizes cells to
the full height).

## Accessibility

Part of the chart image; the chart's text alternative and fallback table carry the mapping.

## Motion

None.

## Dependencies and bundle

None of its own (engine config).

## Test plan

- **unit:** generated configs set orient/direction per engine (`tokens.test.ts`, `flint.test.ts`).
- **visual:** trend, heatmap and scatter baselines.

## Open questions

None.
