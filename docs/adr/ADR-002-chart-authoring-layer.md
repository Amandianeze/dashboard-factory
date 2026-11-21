# ADR-002: Chart authoring layer

- **Status:** Proposed (Phase 4, 2026-11-21); accepted at Gate 4
- **Deciders:** project owner, design-systems agent
- **References:**
  [Flint](https://microsoft.github.io/flint-chart/) (`flint-chart` 1.0.1, pinned) ·
  [Vega-Lite 6](https://vega.github.io/vega-lite/docs/) ·
  [D3](https://d3js.org/) ·
  [Plotly basic bundle](https://github.com/plotly/plotly.js/blob/master/dist/README.md) ·
  `.claude/skills/flint/SKILL.md` (known limits) · Gate 1 and Gate 2 reports

## Context

Panels can be written four ways: Vega-Lite directly, Flint (compiled to Vega-Lite with
`assembleVegaLite`), a D3 chart from `src/components/d3/charts.ts`, or Plotly (basic bundle). The
brief asks for a default per chart family and an explicit escape hatch to D3. The evidence below
comes from the repo's own panels; with 5 chart panels it is a sample, not a benchmark.

## Evidence

**Spec length** (authored panel body vs what Vega-Lite needs; measured on the current specs):

| Panel                       | Written as | Authored          | Compiled Vega-Lite |
| --------------------------- | ---------- | ----------------- | ------------------ |
| Weekly revenue by region    | Vega-Lite  | 32 lines / 594 ch | 1,950 ch           |
| Revenue by region × product | Flint      | 11 lines / 174 ch | 3,640 ch           |
| Intraday candles            | Flint      | 9 lines / 139 ch  | 2,673 ch           |
| Revenue by product (top-N)  | D3         | 8 lines / 129 ch  | —                  |
| Orders vs revenue           | Plotly     | 8 lines / 110 ch  | —                  |

Compiled sizes include about 1.4k characters of injected theme config. Flint specs are roughly
3–4× shorter than hand-written Vega-Lite for the same job, and they carry format meaning
(`Amount/USD`) instead of d3-format strings.

**Theme fidelity.** Vega-Lite and Plotly take the generated theme directly. Flint needed the most
work: Gate 0 found 61 of 76 preset values uncontrolled; Phase 1 now sets every ink and type role
from tokens (unit-tested), but two 1.0.1 limits remain worked around in our code (hard-coded
candlestick colours, remapped in `flintSpec.ts`; heatmap sizing, handled by putting colour keys
beside the plot). D3 charts read tokens through `useTheme()`, so fidelity is exact but every
chart pays for it in code.

**Interaction.** Vega-Lite: selections, tooltips, brushing (the roadmap's cross-panel filter).
Flint: static here until `mountChart` is wired (no `interaction_spec`). D3: anything, all hand-built.
Plotly: zoom and pan on dense scatter, which is why it is in the repo.

**Bundle (gzip, lazy chunks from `vite build`):** app + D3 144 kB; Vega-Lite/embed 272 kB;
Plotly basic 385 kB; Flint 425 kB. Flint is the largest chunk and may carry its own copy of the
Vega-Lite compiler; a page with both Flint and Vega-Lite panels loads both. To verify in Phase 5
with a bundle visualiser (`render-performance` skill).

**Screenshot baselines.** Flint compiles to Vega-Lite and renders through the same `VegaView`, so
it uses the same baseline pipeline. D3 and Plotly render outside Vega and need their own stories.

**Agent error rate: not measured.** What we have is anecdotal: validation catches field and
format mistakes for every renderer; Flint mistakes so far were engine limits (the list above),
not spec mistakes. Phase 7's headless factory runs should record validation failures per
renderer so this ADR can be revisited with data.

## Decision

Default per chart family, in order of preference:

| Family                                                                            | Default                 | Why                                                          |
| --------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| Single numbers                                                                    | KPI card (not a chart)  | Catalog organism; no chart engine                            |
| Line, area, bar, scatter, faceting, anything time-bucketed or brushed             | **Vega-Lite**           | Smallest dependable bundle, interactions, `timeUnit` binning |
| Calendar heatmap, bullet, waterfall, bump, slope, ridgeline, candlestick, heatmap | **Flint**               | 3–4× shorter specs for forms that are fiddly in Vega-Lite    |
| Dense scatter needing zoom and pan                                                | **Plotly** (basic only) | Only engine here with built-in zoom/pan                      |
| Bespoke visuals none of the above can express                                     | **D3** (escape hatch)   | Exact control, at the cost of a component, a test and an LLD |

This matches the order already in CLAUDE.md, so no spec changes are needed.

**The escape hatch to D3** is taken only when all three hold: (1) neither Vega-Lite nor Flint can
express the visual, or can only with a workaround a reviewer rejects; (2) the visual will be
reused (one-offs stay out of the catalog); (3) it gets a catalog item with an approved LLD before
code, then a D3 chart entry (`charts.ts` propsSchema + fieldProps), a component (React renders,
D3 computes), a registry entry and tests. Ranked bars is the reference implementation.

## Consequences

- Flint stays a peer of Vega-Lite, not the single default the brief proposed. The brief's default
  (Flint → Vega-Lite) would route line and bar charts through Flint, which cannot bin dates and
  has no interactions here yet.
- Formats are still duplicated between d3-format strings (Vega-Lite, KPI, D3) and Flint
  `semantics`. A single format source (dataset semantics or format tokens) is the `format`
  package's job, decided in its LLD, not here.
- Revisit when: flint-chart ships `mountChart` interactions we wire up, a Flint release fixes the
  two 1.0.1 limits, or Phase 7 runs produce error-rate data.
