# Power BI Importer — Low-Level Design (LLD)

**Status:** Accepted (2026-11-24; decisions recorded in §7). Gate 0 decision: own phase before Phase 7.
**References:**
[Gate 0](../inventory/gate-0.md) ·
[ADR-002: Chart authoring layer](../adr/ADR-002-chart-authoring-layer.md) ·
[Dashboard schema](../../src/spec/schema.ts) ·
[Flint skill](../../.claude/skills/flint/SKILL.md)

---

## 1. Purpose and scope

Convert a Power BI Project (`.pbip`, PBIR v2.0.0 + TMDL) into a validated Dashboard Factory spec, a
deterministic fixture dataset, and an honest import report that records every visual, measure,
slicer, and layout choice — including what was approximated or skipped.

### In scope (v1)

- **Input format:** `.pbip` projects whose `.Report/` uses **PBIR v2.0.0** (`definition.pbir` v4.0,
  `definition/report.json`, `definition/pages/<pageId>/page.json`, `visuals/<visualId>/visual.json`)
  and whose `.SemanticModel/` uses **TMDL** (`definition/model.tmdl`, `relationships.tmdl`,
  `tables/*.tmdl`).
- **One page per run:** Power BI solution packs commonly contain dozens of pages (45–76 in our
  samples). Each invocation imports a single page (`--page "<displayName-or-id>"`), defaulting to
  the first non-tooltip, visible page in `pages.json`.
- **Optional `.pbix` / CSV data hydration:** When `--csv-dir <dir>` (exported tables) is provided,
  the importer joins tables along TMDL relationships to emit real denormalized fixture rows; when
  omitted, it generates deterministic seeded fixture rows from TMDL column types.
- **Deterministic outputs validated by the existing pipeline:** Every generated spec passes
  `npm run spec:validate` and `npm run verify` with zero manual edits required to compile.

### Non-goals (v1)

- **No DAX evaluation engine.** Complex DAX (time intelligence, `CALCULATE` filter modifiers,
  `SWITCH`, calculation groups, field parameters, visual calculations) is never executed or silently
  faked; it is logged verbatim in the import report for follow-up or the Phase 3 semantic layer.
- **No PBIR-Legacy (`Report/Layout`) parser in v1.** Legacy `.pbix` reports (such as `01. DVF -
Layout Repository.pbix`) are out of v1 scope unless converted to PBIR v2.0.0 first; the CLI fails
  with a clear message pointing at the requirement.
- **No pixel-exact chrome migration.** Decorative shapes, action buttons, bookmark navigators,
  background images, text boxes, custom visuals, and Power BI themes are not reproduced — the
  imported dashboard uses Factory DS tokens (`DESIGN.md`) and the 12-column grid (Gate 0, decision 2).
- **No schema changes required for v1.** Output targets `DashboardSpec` v1 (`src/spec/schema.ts`)
  as-is.

---

## 2. CLI contract and outputs

```bash
npm run import:powerbi -- <path-to-.pbip> \
  [--page "<displayName-or-id>"] \
  [--id <dashboard-id>] \
  [--csv-dir <path-to-exported-csvs>] \
  [--out-dir <repo-root>] \
  [--list-pages] \
  [--dry-run]
```

### Arguments

| Flag           | Required | Default                           | Behavior                                                                          |
| -------------- | -------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `<pbip>`       | yes      | —                                 | Path to `<Name>.pbip` (or its parent directory containing exactly one `.pbip`).   |
| `--page`       | no       | first visible non-tooltip page    | Match by `displayName` (case-insensitive, trimmed) or `pageId`.                   |
| `--id`         | no       | slugified `<pageDisplayName>`     | Output dashboard `id` matching `ID_PATTERN` (`/^[a-z][a-z0-9_-]*$/`).             |
| `--csv-dir`    | no       | none (generate synthetic fixture) | Directory of `<TableName>.csv` files exported from `.pbix` to hydrate rows.       |
| `--out-dir`    | no       | repository root                   | Root directory for outputs (used by tests to write into a temp dir).              |
| `--list-pages` | no       | `false`                           | Print visible non-tooltip pages with visual counts and exit without writing.      |
| `--dry-run`    | no       | `false`                           | Run full parse, map, and Zod/Vega-Lite/Flint validation in memory without writes. |

### Artifacts produced

1. **Dashboard spec:** `dashboards/<id>.dashboard.yaml` — formatted with Prettier, headed by
   `# yaml-language-server: $schema=./dashboard.schema.json`.
2. **Fixture data:** `public/data/<id>.json` — flat array of denormalized row objects matching
   `datasets.<datasetId>.fields`. (Written by the importer CLI, matching the generated-fixture
   convention in `.claude/hooks/guard-paths.mjs`; guard-paths will be updated to mention
   `import:powerbi` alongside `generate-fixtures.ts`.)
3. **Import report:** `docs/powerbi-importer/reports/<id>.import-report.md` — structured Markdown
   listing:
   - Source `.pbip`, page name/id, canvas dimensions, timestamp/tool version.
   - **Mapped** visuals, slicers, and measures (source → target panel id / renderer / field).
   - **Approximated** items with rationale (e.g. unit-scaled `DIVIDE(SUM(...), [_Denominator])`,
     multi-row matrix flattened to `table`, overlapping visuals resolved, unsupported chart downgraded).
   - **Skipped** items with reason (decorative shapes/buttons, hidden visuals, placeholder/SVG
     measures, disconnected navigation/parameter slicers, custom visuals, unmappable complex DAX).
   - **Validation result** (`spec:validate` summary).

---

## 3. Input parsing architecture

Pure TypeScript modules under `scripts/powerbi/`, with no browser/React dependencies:

```
scripts/powerbi/
├── cli.ts              # CLI entrypoint (`npm run import:powerbi`)
├── types.ts            # Internal IR types (PBIP, PBIR, TMDL, ImportReport)
├── read-pbip.ts        # Resolve .pbip -> .Report (PBIR v2.0.0) & .SemanticModel (TMDL)
├── parse-tmdl.ts       # Parse model.tmdl, relationships.tmdl, tables/*.tmdl
├── parse-dax.ts        # Classify DAX measures (simple | unit-scaled | placeholder | complex)
├── map-format.ts       # Power BI / .NET format strings -> d3-format + Flint semantics
├── map-layout.ts       # Pixel (x, y, width, height) -> 12-column LayoutRow[]
├── map-visuals.ts      # PBIR visual.json -> PanelSpec + FilterSpec + ImportReport entries
├── build-dataset.ts    # Star-schema join (CSV) or seeded synthetic generator -> Row[]
└── emit.ts             # YAML serializer, report writer, post-emit checkSpecFile() check
```

### 3.1 PBIR v2.0.0 reader (`read-pbip.ts`)

1. Read `<Name>.pbip` → locate `artifacts[0].report.path`.
2. Read `<Report>/definition.pbir`:
   - Require `version` starting with `4.` (PBIR v2.0.0). If `1.0`, fail fast with a clear error
     stating PBIR-Legacy is unsupported in v1.
   - Resolve `datasetReference.byPath.path` → `<SemanticModel>`.
3. Read `definition/pages/pages.json` (`pageOrder`) and each `<pageId>/page.json`.
   - Filter out pages with `type === "Tooltip"` or `visibility === "HiddenInViewMode"` unless
     explicitly targeted by `--page`.
4. For the selected page, read all `visuals/<visualId>/visual.json`:
   - Skip visuals where `isHidden === true` or `visualGroup` containers (log hidden visuals as
     skipped in the report).
   - Sanitize titles extracted from `visual.visualContainerObjects.title[].properties.text`:
     strip invisible directional/BOM characters (`[\u200b-\u200f\ufeff]`) and collapse whitespace
     _(observed in Part I pages where `\u200e` is repeated 20+ times to pad titles)_.

### 3.2 TMDL parser (`parse-tmdl.ts`)

Indented-block parser covering the subset needed for schema, relationships, and measures:

- `relationships.tmdl`: `fromColumn`, `toColumn`, `isActive` (default `true`), `fromCardinality`,
  `toCardinality`, `crossFilteringBehavior`.
- `tables/*.tmdl`:
  - `table <name>` (`isHidden`, `isPrivate`, `dataCategory`).
  - `column <name>` (`dataType`, `formatString`, `summarizeBy`, `sourceColumn`, `isHidden`).
  - `measure <name> = <expr>` (both single-line and fenced ` ``` ` blocks; `formatString`,
    `formatStringDefinition`, `displayFolder`, `isHidden`).
  - `calculationGroup` detection (recorded so visuals referencing calculation group columns are
    flagged accurately in the import report).

TMDL data types map to `FieldType` (`src/spec/schema.ts`):

| TMDL `dataType`              | `FieldType`    | Default Flint `semantics` inference                                                  |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `dateTime`                   | `temporal`     | `Date`                                                                               |
| `int64`, `double`, `decimal` | `quantitative` | `Amount` (if currency fmt), `Percentage` (if `%`), else `Count` / `Quantity`         |
| `string`, `boolean`          | `nominal`      | `Country` / `Region` / `Category` / `Name` by column name heuristic, else `Category` |

---

## 4. Mapping rules

### 4.1 Visual type → panel `kind` & `renderer`

Follows ADR-002's renderer priority (`kpi` / `table` → `vega-lite` → `flint` → `d3` → `plotly`):

| Power BI `visualType`                                                             | Target `kind` | Target `renderer` | Mapping notes                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card`, `cardVisual`                                                              | `kpi-card`    | `kpi`             | Primary `Data` / `Values` projection → `field` + `aggregate` + `format`. Multi-measure `cardVisual` splits into one KPI panel per valid measure or takes the primary measure and logs extras as approximated.                                           |
| `tableEx`, `pivotTable`                                                           | `data-table`  | `table`           | `Values` (tableEx) or `Rows` + `Values` (pivotTable) → `columns[]`. Multi-level row/column hierarchies in `pivotTable` flatten to columns and log as **approximated**.                                                                                  |
| `lineChart`                                                                       | `chart-panel` | `vega-lite`       | `mark: line`. `Category` → `x`, `Y` → `y` (multi-measure uses Vega-Lite `fold` transform), `Series` → `color`.                                                                                                                                          |
| `areaChart`, `stackedAreaChart`                                                   | `chart-panel` | `vega-lite`       | `mark: area`.                                                                                                                                                                                                                                           |
| `clusteredColumnChart`, `columnChart`                                             | `chart-panel` | `vega-lite`       | `mark: bar`, vertical (`x`: category, `y`: measure; `xOffset` for clustered multi-series, stacked for `columnChart`).                                                                                                                                   |
| `clusteredBarChart`, `barChart`                                                   | `chart-panel` | `vega-lite`       | `mark: bar`, horizontal (`y`: category, `x`: measure).                                                                                                                                                                                                  |
| `scatterChart`                                                                    | `chart-panel` | `vega-lite`       | `mark: point`. `X` → `x`, `Y` → `y`, `Series`/`Category` → `color`/tooltip, `Size` → `size`.                                                                                                                                                            |
| `donutChart`, `pieChart`                                                          | `chart-panel` | `vega-lite`       | `mark: { type: arc, innerRadius: 50 }` (donut) or `innerRadius: 0` (pie), `theta` + `color`.                                                                                                                                                            |
| `lineClusteredColumnComboChart`, `lineStackedColumnComboChart`                    | `chart-panel` | `vega-lite`       | Layered Vega-Lite spec (`layer: [bar, line]`). Dual y-axis (`Y2`) gets `resolve: { scale: { y: independent } }` and logs as **approximated**.                                                                                                           |
| `waterfallChart`                                                                  | `chart-panel` | `flint`           | `chartType: "Waterfall Chart"`, `encodings: { x, y }`. Requires dataset `semantics`. Breakdown sub-categories logged as **approximated**.                                                                                                               |
| `slicer`, `listSlicer`, `advancedSlicerVisual`                                    | _(filter)_    | —                 | Mapped to top-level `filters[]` (`select` if single-select config, else `multiselect`) **only if** the slicer column's table connects via active TMDL relationships to the page dataset. Otherwise skipped as disconnected parameter/navigation slicer. |
| `shape`, `actionButton`, `image`, `textbox`, `bookmarkNavigator`, `pageNavigator` | _(skipped)_   | —                 | Logged under **Skipped (chrome / navigation)**.                                                                                                                                                                                                         |
| `azureMap`, `shapeMap`, `map`, `filledMap`                                        | _(skipped)_   | —                 | Logged under **Skipped (unsupported map)** — Flint maps fetch external CDN topologies (`.claude/skills/flint/SKILL.md`).                                                                                                                                |
| Custom visuals (e.g. `textSearchSlicer*`, `ChicletSlicer*`)                       | _(skipped)_   | —                 | Logged under **Skipped (custom visual)**.                                                                                                                                                                                                               |

### 4.2 DAX measure classification (`parse-dax.ts`)

Every measure referenced by a visual is resolved against TMDL and classified into one of four
buckets (in order):

1. **Placeholder / visual hack → skip projection**
   - Expression is `BLANK()`, `""`, `0`, a hex colour literal (`"#..."`), or builds an SVG data URI
     (`data:image/svg+xml`).
   - Also matches known display-only names when expression returns string/SVG (e.g. `Data Bar`,
     `Placeholder`, `FX Color`, `UNICHAR`).
   - Dropped from encodings/table columns and recorded in the import report.
2. **Simple aggregate → exact mapping**
   - `SUM(T[C])` → `{ field: c, aggregate: 'sum' }`
   - `AVERAGE(T[C])` → `{ field: c, aggregate: 'mean' }`
   - `MIN(T[C])` → `{ field: c, aggregate: 'min' }`
   - `MAX(T[C])` → `{ field: c, aggregate: 'max' }`
   - `COUNT(T[C])` / `COUNTA(T[C])` → `{ field: c, aggregate: 'count' }`
   - `DISTINCTCOUNT(T[C])` → `{ field: c, aggregate: 'distinct' }`
   - `COUNTROWS(T)` → `{ field: <key-or-first-col>, aggregate: 'count' }`
3. **Unit-scaled wrapper → approximated mapping**
   - Pattern observed in Revenue Analysis Part II: `DIVIDE(SUM(T[C]), [_Denominator])` or
     `SUM(T[C]) / 1000` where the denominator is a unit-scaling measure or power-of-10 literal.
   - Unwraps to the inner simple aggregate (`{ field: c, aggregate: 'sum' }`), applies compact
     formatting, and logs as **approximated**.
4. **Complex DAX → flagged (not evaluated)**
   - Everything else: time-intelligence (`SAMEPERIODLASTYEAR`, `DATEADD`, `TOTALYTD`), `CALCULATE`
     with filter predicates, `VAR ... RETURN` multi-step calculations, `SWITCH`, calculation groups,
     `Arithmetic` / `NativeVisualCalculation` inline projections.
   - **Handling:**
     - If a chart/table has **at least one mapped measure**, drop the unmappable series/column and
       log its name + DAX snippet under **Skipped / Complex DAX**.
     - If **all** measures on a visual are complex DAX (common in showcase packs like Part II's YoY
       variance charts):
       - Attempt a one-hop base-column trace (if the DAX references a single fact column like
         `FCT_Summarized_Data[Revenue]` or a simple measure like `[_Revenue AC]`, bind to a
         derived placeholder numeric field `<measure_slug>` in the dataset so the panel still
         renders structurally) **and** clearly flag the panel as **Approximated (complex DAX —
         placeholder values)** with the full DAX expression in the import report.
       - If no fact column can be traced at all (e.g. pure disconnected UI helper), skip the visual
         and record why.

### 4.3 Format string translation (`map-format.ts`)

Translates Power BI / .NET format strings (`formatString` on measure or column) into valid
`D3FormatString` (`src/spec/d3Format.ts`):

| Power BI format pattern                    | `d3-format` | Notes                                           |
| ------------------------------------------ | ----------- | ----------------------------------------------- |
| `$#,0`, `$#,##0`, `\$#,0;($#,0);\$0`       | `'$,.0f'`   | Currency integer                                |
| `$#,0.00`                                  | `'$,.2f'`   | Currency 2 decimals                             |
| `#,0`, `#,##0`, `#,0;-#,0;0`               | `',.0f'`    | Grouped integer                                 |
| `#,0.0`, `#,0.0;-#,0.0;0`                  | `',.1f'`    | Grouped 1 decimal                               |
| `#,0.00`                                   | `',.2f'`    | Grouped 2 decimals                              |
| `+#,0;-#,0;0`                              | `'+,.0f'`   | Signed integer (sets table `conditional: sign`) |
| `0%`, `0%;-0%;0%`                          | `'.0%'`     | Integer percent                                 |
| `0.0%`, `0.0%;-0.0%;0.0%`                  | `'.1%'`     | 1-decimal percent                               |
| `0.00%`, `0.00%;-0.00%;0.00%`              | `'.2%'`     | 2-decimal percent                               |
| `+0.0%;-0.0%;0.0%`                         | `'+.1%'`    | Signed percent (sets table `conditional: sign`) |
| Dynamic `formatStringDefinition` / unknown | `',.0f'`    | Fallback + logged as **approximated**           |

Every emitted format string is validated through `D3FormatString` before serialization.

### 4.4 Pixel layout → 12-column grid (`map-layout.ts`)

Dashboard Factory uses a 12-column row-based CSS grid (`LayoutRow`: `height` in `[80, 900]`,
`cells` summing to `≤ 12`, each `span` in `[1, 12]`).

Algorithm:

1. **Collect placed visuals** (only visuals that produced a panel; slicers move to the top
   `filters` bar, so their canvas strip is excluded when computing the content bounding box).
2. **Detect heavy overlaps** (bookmark-toggled stacked visuals where `overlapArea / minArea > 0.5`):
   keep the top `z`-index visual in place and push overlapped siblings to a trailing row (or skip
   duplicates with identical title + visualType + query), logging the overlap in the import report.
3. **Compute content bounding box** (`minX`, `maxX`, `minY`, `maxY`) across remaining panels so
   removed left-side navigation/slicer strips don't leave dead whitespace on the left of the 12-col
   grid.
4. **Cluster into rows** by vertical overlap: sort panels by `y`, then group panels whose vertical
   intervals overlap by at least 35% of the shorter panel's height into the same `LayoutRow`.
   _(Handles Power BI pages where a tall panel spans beside two stacked panels by splitting into
   clean rows and logging the approximation, since `LayoutRow` has no CSS `row-span`.)_
5. **Sort cells left-to-right (`x`)** within each row and allocate integer spans summing to 12:
   - Proportional share `rawSpan = (w / sumRowW) * 12` (or full-width `span = 12` if single panel
     covering > 75% of content width).
   - Enforce minimum readable spans: `kpi` ≥ 2, `chart-panel` ≥ 3, `data-table` ≥ 4 (splitting a
     crowded row into two rows if minimum spans exceed 12).
   - Distribute rounding remainder to the widest cells so `sum(span) === 12` (or `<= 12` when a
     single narrow card sits alone).
6. **Row height (px):**
   - KPI-only rows: `132` (matches `revenue-overview.dashboard.yaml`).
   - Chart / table rows: scale `rowPxHeight * (900 / pageHeight)` clamped to `[260, 520]` (within
     schema bounds `[80, 900]`), rounded to multiples of `20`.

### 4.5 Star-schema dataset assembly (`build-dataset.ts`)

Because `FilterSpec` requires every filtered panel to share one `dataset`, the importer constructs a
single denormalized dataset per imported page:

1. Identify the primary fact table from mapped measures/columns (the "many" side of active M:1
   relationships in `relationships.tmdl`, e.g. `FCT_Summarized_Data`).
2. Follow active M:1 relationships outward (1–2 hops, e.g. `FCT_Summarized_Data.Customer_ID →
DIM_Customers.Customer_ID`, `FCT_Summarized_Data.Date → Dim Calendar.Date`) to include referenced
   dimension and slicer columns.
3. Normalize field names to clean snake_case identifiers (`Start of Month` → `start_of_month`,
   `Customer_Name` → `customer_name`, avoiding collisions with table prefix if needed).
4. **Row generation:**
   - **With `--csv-dir`:** read fact + dimension CSVs, perform in-memory left join on the TMDL
     relationship keys, project only the fields declared in `datasets.<id>.fields`, coerce types
     (ISO dates, numbers), and write `public/data/<id>.json`.
   - **Without `--csv-dir` (pure `.pbip`):** generate 120–300 deterministic rows using `mulberry32`
     seeded from the dashboard `id` (matching `scripts/generate-fixtures.ts`), respecting temporal
     continuity (`YYYY-MM-DD`), realistic categorical cardinalities (4–12 distinct labels), and
     positive/signed numeric ranges based on format strings.

---

## 5. Selected golden sample pages

We scanned all 121 pages across the converted PBIR v2.0.0 projects in
`/Users/amandianezeibe/Downloads/PBI_Solutions/pbip/` for zero-overlap layouts (`ov = 0.00`),
high visual diversity, and realistic Power BI patterns. Three real pages plus one minimal synthetic
PBIP cover the entire mapping surface:

| #   | Fixture ID                    | Source PBIP & Page                                                 | Canvas    | Visuals & Slicers                                                                                                    | What it tests                                                                                                                                                   |
| --- | ----------------------------- | ------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `minimal-sales`               | Synthetic minimal PBIP (`tests/fixtures/powerbi/minimal-sales/`)   | 1280×720  | 2 `card`, 1 `lineChart`, 1 `clusteredBarChart`, 1 `tableEx`, 1 `slicer`                                              | 100%-mapped happy path: zero approximations, simple `SUM`/`AVERAGE`/`DISTINCTCOUNT`, pure synthetic fixture generation                                          |
| 1   | `fp-scenario-v2`              | Part II — `FP - Scenario Selection V2` (`cc861dc3b8d840d085ff`)    | 1920×1080 | 2 `cardVisual`, 2 `clusteredColumnChart`, 2 `pivotTable`, 5 slicers (2 connected, 3 disconnected)                    | KPI cards, multi-series column charts, matrix flattening, `DIVIDE(SUM, [_Denominator])` unwrapping, `Data Bar` skipping, connected vs disconnected slicers      |
| 2   | `variance-waterfall-extended` | Part II — `Variance Waterfall - Extended` (`b255974c3bcc20f0c0bc`) | 1920×1080 | 1 `waterfallChart`, 1 `clusteredColumnChart`, 1 `pivotTable`, 4 slicers                                              | Flint `Waterfall Chart` + `semantics`, tall-beside-stacked row splitting, `Placeholder v1` skipping, complex YoY DAX reporting                                  |
| 3   | `item-highlighting-2`         | Part I — `Item Highlighting II` (`098684686b6e89b49de3`)           | 2350×1321 | 1 `scatterChart`, 1 `columnChart`, 1 `donutChart`, 2 `pivotTable`, 5 slicers + 1 custom visual (`textSearchSlicer*`) | Simple `SUM` mapping, scatter + stacked column + donut charts, custom visual skipping, disconnected `DIM_Pages` nav-pane filtering, `\u200e` title sanitization |

### Test fixture footprint

Rather than committing the entire 2,900-file Part I & Part II projects, we commit **trimmed
single-page PBIP slices** under `tests/fixtures/powerbi/<fixture-id>/` containing:

- `<fixture>.pbip` + `definition.pbir` + `definition/report.json` + `version.json` + `pages.json` +
  only the single selected page's `page.json` and `visuals/*/visual.json`
- Only the TMDL files referenced by that page (`database.tmdl`, `model.tmdl`, `relationships.tmdl`,
  and the referenced `tables/*.tmdl`)
- Optional small CSV exports of the synthetic fact/dimension tables (`FCT_Summarized_Data.csv`,
  `DIM_Customers.csv`, `Dim Calendar.csv` — ~200 KB total, 100% fictional accounts).

---

## 6. Verification and testing plan

1. **Unit tests (`tests/unit/powerbi-importer.test.ts`):**
   - `parse-tmdl`: tables, columns, data types, single-line & fenced multi-line DAX measures,
     relationships, calculation groups.
   - `parse-dax`: simple aggregates, unit-scaled `DIVIDE`, placeholder/SVG filtering, complex DAX.
   - `map-format`: Power BI currency/percent/signed/grouped formats → valid `D3FormatString`.
   - `map-layout`: row clustering, span normalization (`sum <= 12`), overlap resolution, KPI vs
     chart height clamping.
   - `map-visuals`: every supported `visualType` + skipped chrome/custom/map visuals + disconnected
     slicer filtering + `\u200e` title cleanup.
2. **Golden tests (`tests/unit/powerbi-golden.test.ts`):**
   - Run the full pipeline on all 4 fixtures (`minimal-sales` + the 3 trimmed Part I/II pages) in a
     temp directory.
   - Assert exact match against committed golden `.dashboard.yaml` and `.import-report.md` files.
   - Assert `checkSpecFile()` (`scripts/lib/specs.ts`) returns **0 errors** (Zod schema, cross-refs,
     fixture field check, Vega-Lite compile, Flint `validateChart`).
3. **Browser render smoke check:**
   - Import one fixture dashboard into `dashboards/` (or verify via `npm run panel:render` /
     Playwright) to confirm zero console errors and readable layout in light and dark themes.
4. **Harness integration (Phase step 5, after CLI + tests are green):**
   - Add `.claude/skills/powerbi-import/SKILL.md` documenting workflow, flags, and post-import
     cleanup of flagged DAX items.
   - Add `.claude/commands/import-template.md` (`/import-template <path-to-.pbip> [page]`).
   - Update `.claude/hooks/guard-paths.mjs` message for `public/data/` to note `import:powerbi`.

---

## 7. Decisions (owner, 2026-11-24)

| #   | Question                     | Decision                                                                                                        |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | LLD approval                 | **Approved** to implement `scripts/powerbi/`, the 4 fixtures, unit/golden tests, and harness skill/command.     |
| 2   | Fixture placement            | **Keep all 4 under `tests/fixtures/powerbi/`** so the app index and e2e screenshot baselines stay untouched.    |
| 3   | `.pbix` pre-converter helper | **Bundle `scripts/powerbi/pbix_to_pbip.py`** (optional pre-step; CI and `verify` stay 100% Node/TS, no Python). |
