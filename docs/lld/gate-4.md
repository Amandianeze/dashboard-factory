# Gate 4: LLD system

**Status:** ready for review, 2026-11-21. Branch `design-system/phase-4` (from `design-system/phase-3`).

## What was produced

- **[`_template.md`](_template.md):** the LLD template: front matter with every field explained,
  and the 12 body sections in order.
- **26 full LLDs:** the 13 built items and the 13 P1/P2 gaps (Gate 3, decision 1). The 8 P3 items
  stay front-matter stubs, and validation keeps them that way.
- **24 props files** (`docs/lld/<id>.props.ts`, type-checked; legend and axis are engine-drawn and
  have none).
  - KPI card, filter bar and dashboard template now import their props from these files, so the
    interface has one home.
  - Ranked bars re-exports its type from `charts.ts`, whose Zod schema Node validation needs.
  - Proposed items' props files are the designed API, following Base UI conventions where they
    wrap a primitive. Data table and KPI value also carry Zod data contracts (`TablePanel`,
    `KpiComparison`).
- **ADRs 002–005** (`docs/adr/`):
  - 002: chart authoring layer
  - 003: primitives and icons
  - 004: distribution
  - 005: versioning and contribution flow
- **`npm run lld:check`** (in `verify`) validates three things:
  - **Front matter:** every field, `registryItem` and `props` pinned to the id, P3 stubs kept lean.
  - **References to other files:** tokens exist and are semantic/component/density/motion tier
    (never primitive or raw palette), `newTokens` don't exist yet, props files and data-contract
    exports exist, ADRs exist.
  - **Body:** the 12 template sections are present, in order.
- **Rename:** `src/components/d3/catalog.ts` → `charts.ts`, `d3Catalog` → `d3Charts` (Gate 3,
  decision 2).

## Checks

| Check                                            | Result                                        |
| ------------------------------------------------ | --------------------------------------------- |
| `npm run verify`                                 | ✓ green; 76 unit tests (7 new LLD-rule tests) |
| `lld:check`                                      | ✓ 34 items: 26 full LLDs valid, 8 P3 stubs    |
| Tokens referenced by LLDs                        | ✓ all exist; none primitive or raw palette    |
| `newTokens` (tokens to add when items are built) | 82 across 16 items, none colliding            |
| Visual change                                    | none (types only)                             |

## ADR decisions to accept

1. **ADR-002 Chart layer:** Vega-Lite stays the default; Flint is used for the forms it does
   better (heatmap, calendar, bump, candlestick…); Plotly only for zoom/pan; D3 is the escape
   hatch with three conditions. **This differs from the brief**, which made Flint → Vega-Lite the
   default. Measured on our panels, Flint specs are 3–4× shorter. But Flint can't bin dates, has
   no interactions wired here, and is the largest chunk (425 kB gzip). Agent error rate wasn't
   measurable yet; Phase 7 runs will record it.
2. **ADR-003 Primitives and icons:** Base UI (`@base-ui/react` 1.9.0) and Lucide. Both are
   shadcn's defaults since July 2026. The filter select stays native.
3. **ADR-004 Distribution:** a `@factory` shadcn registry first; npm packages only when a second
   app appears (Gate 0). `package` in each LLD is the future boundary.
4. **ADR-005 Versioning:** one system version until the split, semver rules, and a status
   lifecycle: deprecated items keep working for two minor releases, then are removed in the next
   major. Contribution flow: proposal → LLD PR → design review → build → gate. Agents never
   self-approve.

## Found while writing the LLDs

Real issues the LLDs record, by impact:

1. **No chart has a text alternative.** There is no summary and no data-table fallback. This is
   the largest accessibility debt (principle 6). The data-table LLD covers both uses.
2. **shadcn needs Tailwind v4,** which the repo doesn't have. Phase 5 adds it with a generated
   `@theme` block (ADR-003 consequences).
3. **Flint's chunk may include its own copy of the Vega-Lite compiler** (425 kB vs 272 kB for
   Vega-Lite). To check with a bundle visualiser in Phase 5.
4. **Ranked bars can't show negative values** (x domain starts at 0); validation doesn't reject them.
5. **Long KPI values overflow** narrow cells (10⁹ with `$,.0f` in span 2).
6. **The filter bar doesn't cope with many options:** 200 distinct values would render 200 chips,
   and a field with no values renders only its legend.
7. **`pick-ui-library` isn't installed.** The brief requires it before adding dependencies;
   ADR-003 records the comparison it would ask for.

## Open questions

The LLDs record 8 design questions, each with an owner. The ones that need you:

1. **Accept ADRs 002–005?** In particular ADR-002's departure from the brief's Flint-first
   default, and ADR-003's Base UI over Radix.
2. **KPI comparison** (`kpi-value`): start with field-based `compareTo` (e.g. `previous_close`)
   and leave period offsets (same day last year) for the semantic layer?

The other six go to design review when each item is built: KPI overflow strategy, the chart text
alternative source, ranked-bars negatives, the filter chip/select threshold, named template
regions, and a `danger` button variant.

## Not done / deferred

- **Figma:** `figmaNode` is null everywhere (no Figma file, Gate 0).
- **Motion:** designed for only 2 items (tooltip fade, skeleton pulse); the rest is Phase 6.
- **Packages:** LLDs exist for catalog items only. The `format` module and semantic layer get
  package LLDs when they're built (Gate 3 taxonomy note).
- **Linux screenshot baselines** (Docker) are still pending from Gate 1.

## Decisions (2026-11-21)

| #   | Question       | Decision                                                                                        |
| --- | -------------- | ----------------------------------------------------------------------------------------------- |
| 1   | ADRs 002–005   | **Accepted**, including ADR-002 (Vega-Lite default, Flint for its forms) and ADR-003 (Base UI). |
| 2   | KPI comparison | **Field-based `compareTo` first**; period offsets wait for the semantic layer.                  |
