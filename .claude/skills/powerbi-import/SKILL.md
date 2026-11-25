---
name: powerbi-import
description: Import a Power BI Project (.pbip, PBIR v2.0.0 + TMDL) — or pre-convert a .pbix on macOS/Linux — into a validated Dashboard Factory YAML spec, fixture data, and import report. Use when importing Power BI templates or reports or updating scripts/powerbi/.
---

# Power BI Import

Converts a Power BI Project (`.pbip`) page into:

1. `dashboards/<id>.dashboard.yaml` (validated by `npm run spec:validate`)
2. `public/data/<id>.json` (denormalized from CSVs when `--csv-dir` is given, or deterministic synthetic rows)
3. `docs/powerbi-importer/reports/<id>.import-report.md` (mapped, approximated, and skipped items)

Design contract: `docs/powerbi-importer/lld.md`.

## Workflow

### 0. If the user only has a `.pbix` file

In Power BI Desktop on Windows: **File → Save as → Power BI Project (.pbip)** (with PBIR enhanced format enabled).

On macOS/Linux without Power BI Desktop, use the bundled Python pre-converter (requires `pbixray` in a virtualenv; never required by CI or `npm run verify`):

```bash
python3 -m venv /tmp/pbi-venv && /tmp/pbi-venv/bin/pip install pbixray
/tmp/pbi-venv/bin/python scripts/powerbi/pbix_to_pbip.py <input.pbix-or-dir> <out-dir> --export-csv
```

Note: `.pbix` files using legacy `Report/Layout` (PBIR-Legacy v1.0) are rejected by `import:powerbi` v1 with a clear error; only native PBIR v2.0.0 (`definition.pbir` v4.x) is supported.

### 1. List pages (for multi-page solution packs)

```bash
npm run import:powerbi -- <path-to-.pbip> --list-pages
```

### 2. Run the import

```bash
npm run import:powerbi -- <path-to-.pbip> \
  --page "<Page Display Name>" \
  [--id <dashboard-id>] \
  [--csv-dir <path-to-csv-dir>]
```

Use `--dry-run` first to inspect validation without writing files.

### 3. Review the import report and clean up

Read `docs/powerbi-importer/reports/<id>.import-report.md`:

- **Approximated**: check unit-scaled `DIVIDE(SUM(...), [_Denominator])` formats, flattened `pivotTable` columns, split grid rows, and complex DAX placeholder fields.
- **Skipped**: verify decorative shapes/buttons, disconnected navigation/parameter slicers, custom visuals, and unmapped complex DAX measures. Replace any complex DAX placeholder fields with real fields or wait for the Phase 3 semantic layer.
- **Verify**: run `npm run verify` and visually inspect the dashboard (`npm run dev`, then `#/d/<id>`, or `npm run panel:render -- <id> <panel>`).

## Code map

- `scripts/powerbi/cli.ts` — CLI entrypoint (`npm run import:powerbi`)
- `scripts/powerbi/read-pbip.ts` — `.pbip` + PBIR v2.0.0 reader and title sanitizer
- `scripts/powerbi/parse-tmdl.ts` — TMDL parser (`model.tmdl`, `relationships.tmdl`, `tables/*.tmdl`)
- `scripts/powerbi/parse-dax.ts` — DAX classifier (`placeholder` | `simple` | `unit-scaled` | `complex`)
- `scripts/powerbi/map-format.ts` — Power BI format string → `d3-format` + Flint `semantics`
- `scripts/powerbi/map-layout.ts` — pixel `(x, y, width, height)` → 12-column `LayoutRow[]`
- `scripts/powerbi/map-visuals.ts` — PBIR visuals & connected slicers → `PanelSpec` & `FilterSpec`
- `scripts/powerbi/build-dataset.ts` — CSV star-schema joiner or seeded `mulberry32` fixture generator
- `scripts/powerbi/emit.ts` — YAML/report emitter + `checkSpecFile()` verification
- `scripts/powerbi/pbix_to_pbip.py` — optional macOS/Linux `.pbix` → `.pbip` + CSV pre-converter
- `tests/unit/powerbi-importer.test.ts` & `tests/unit/powerbi-golden.test.ts` — unit & golden tests
