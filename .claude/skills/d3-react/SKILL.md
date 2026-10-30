---
name: d3-react
description: How to build a bespoke D3 chart component for the D3 catalog — React renders SVG, D3 computes — including catalog registration, props schema, sizing, accessibility and testing. Use when adding or changing anything in src/components/d3/.
---

# D3 + React components

Reference implementation: `src/components/d3/RankedBars.tsx`. Copy its shape.

## The pattern

- **React owns the DOM.** Render `<svg>`, `<g>`, `<rect>`, `<path>`, `<text>` in JSX.
- **D3 does math only.** `scaleLinear`, `scaleBand`, `scaleTime`, `line`, `area`, `arc`, `stack`,
  `pie`, `hierarchy`, `format`, `rollups`. Use `path` generators to produce `d` strings.
- **No `d3.select(...)` mutations** inside React components. The only acceptable exceptions are
  `d3-zoom`/`d3-brush` behaviors attached in a `useEffect` to a ref, cleaned up on unmount.
- Memoize data shaping with `useMemo`; keep the shaping itself in a pure, tested function.

## Contract

```ts
// catalog.ts (no React import — Node scripts load this)
export const MyChartProps = z.object({ x: z.string(), y: z.string(), valueFormat: D3FormatString.default(',.0f') }).strict();
export const d3Catalog = { ..., MyChart: define({ description, propsSchema: MyChartProps, fieldProps: ['x', 'y'] }) };

// MyChart.tsx
export function MyChart({ data, props, width, height }: D3ChartProps<z.infer<typeof MyChartProps>>) { ... }

// registry.tsx
export const d3Registry = { ..., MyChart };
```

`fieldProps` lets validation reject specs that point props at undeclared fields.

## Requirements

- Size to the given `width`/`height` (the container is measured by ResizeObserver). Reserve label
  space with constants; never overflow the box.
- Empty data → render `<p className="panel-empty">No data</p>`.
- Colors, fonts, sizes from `tokens` (`src/theme/tokens.ts`) only.
- `<svg role="img" aria-label="...">` and a `<title>` per mark for hover/screen readers.
- Format numbers with `d3.format(props.valueFormat)`.
- Add a unit test for the data shaping, run `npm run test:e2e`, and look at the panel screenshot.
