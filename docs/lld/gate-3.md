# Gate 3: atomic taxonomy and catalog structure

**Status:** ready for review, 2026-11-21. Branch `design-system/phase-3` (from `design-system/phase-2`).

## What was produced

- **[`docs/taxonomy.md`](../taxonomy.md):** the UI ladder × BI ladder map, placement rules, the
  pages, the panel kinds, the gap list and the deprecation list. Its tables are generated from
  the catalog, so they can't drift from it.
- **34 catalog items** as front-matter stubs in `docs/lld/<id>.md`: 13 atoms, 10 molecules,
  7 organisms, 4 templates. 13 are `beta` (built, no LLD or story yet) and 21 are `proposed` (gaps).
  The front matter is the single source: Phase 4 adds the rest of the LLD fields and the body to
  the same files.
- **`npm run catalog:build`** (`scripts/catalog/`) validates the front matter and generates:
  - `catalog.json`: the lookup agents read before building anything
  - `src/spec/generated/panel-kinds.ts`: the dashboard `kind` enum and the renderers each kind allows
  - the tables between the markers in `docs/taxonomy.md`
- **Dashboard `kind`:** every panel now names its organism (`kpi-card` or `chart-panel`). The Zod
  enum comes from the catalog. A kind/renderer mismatch, a proposed kind, or a missing kind fails
  validation. Both dashboards, the scaffold, the skill examples and the JSON Schema are updated,
  and panels carry `data-kind` in the DOM.

## Checks

| Check                                                                | Result                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `npm run verify` (now includes `catalog:build -- --check`)           | ✓ green; 69 unit tests (10 new in `catalog.test.ts`) |
| Front matter: schema, id = file name, source files exist             | ✓ 34/34                                              |
| Composition goes down the ladder; nothing built from a proposed item | ✓                                                    |
| Every schema `renderer` belongs to exactly one panel kind            | ✓ (unit test)                                        |
| Every panel in `dashboards/` resolves to one built organism          | ✓ 14 panels: 9 `kpi-card`, 5 `chart-panel`           |
| Write guard on `catalog.json` and `src/spec/generated/`              | ✓ tested with sample hook payloads                   |

No visual change: the only DOM change is the `data-kind` attribute, so `test:e2e` baselines are
unaffected.

## Gap list

The [gap list](../taxonomy.md#gap-list) is generated, ranked P1–P3. **P1 (7):** badge, button,
delta indicator, tooltip, empty state, KPI value with delta, data table. These cover both Gate 2
gaps (table, status badge), the accessibility holes (descriptions in `title=`, no data-table
fallback for charts) and the period-comparison pattern that would turn 3 of sp500-today's tiles
into one card.

## Deprecation list

Nine duplicates still in the code ([table](../taxonomy.md#deprecation-list)). Each one is retired
when its replacement is built, not before. Phases 1–2 already removed the colour, type-size,
bar-radius and legend duplicates from the Gate 0 list.

## Decisions I made (say if you want any reversed)

1. **The catalog source is LLD front matter from day one**, not a separate seed file. The brief
   makes the LLD front matter the contract and `catalog.json` its output, so Phase 3 writes the
   taxonomy fields and Phase 4 fills the rest of the same files. No migration later.
2. **`kind` is required** on every panel, not derived from `renderer`. It is a little redundant
   for KPIs (`kind: kpi-card` + `renderer: kpi`), but agents see the organism explicitly and a new
   kind (e.g. `data-table`) needs no inference rules.
3. **Proposed organisms are not valid kinds** until built. `data-table` is in the catalog with no
   renderer and is rejected by the schema.
4. **Pages are not catalog items**; they are the dashboard specs and app screens, listed in the
   taxonomy. Measures and formats aren't catalog items either: they become the `format` module
   and the semantic layer (package LLDs in Phase 4).
5. **Placements that differ from the brief's starter table:** Empty state is a molecule, Sparkline
   an atom, Chart panel includes Plotly, and the template uses the 12-column grid (Gate 0).

## Open questions

1. **Phase 4 scope.** Write full LLDs for P1 and P2 gaps (14 items) and the 13 beta items, and
   leave P3 (product-UI templates, app chrome) as stubs until a CRUD page is actually wanted?
   That fits the slim-scope decision from Gate 0. The alternative is all 34 now.
2. **Name clash.** `src/components/d3/catalog.ts` (D3 chart props contracts) and `catalog.json`
   (the design-system catalog) are both "the catalog". I'd rename the D3 file to
   `src/components/d3/charts.ts` in Phase 4. It's a mechanical rename, but CLAUDE.md, two skills
   and the chart-builder agent mention it.

## Not done / deferred

- Linux screenshot baselines (Docker) are still pending from Gate 1.
- The ADRs Phase 4 needs (ADR-002 chart layer, ADR-003 primitives and icons) aren't started. The
  icon gap (P2) waits on ADR-003.
