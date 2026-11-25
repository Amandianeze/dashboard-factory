---
description: Import a Power BI Project (.pbip) or .pbix page into a validated dashboard spec and import report
argument-hint: <path-to-.pbip-or-.pbix> [--page "<page name>"] [--id <dashboard-id>]
---

Import a Power BI report page into Dashboard Factory:

$ARGUMENTS

Read `.claude/skills/powerbi-import/SKILL.md` first, then run this workflow:

1. If the input is a `.pbix` file, convert it to `.pbip` (with `--export-csv`) into a temporary folder using `scripts/powerbi/pbix_to_pbip.py` in a Python venv with `pbixray`.
2. If no `--page` was given and the report has multiple visible pages, run `npm run import:powerbi -- <pbip> --list-pages` and either pick the clearest main page or ask the user which page to import.
3. Run `npm run import:powerbi -- <pbip> [--page "<name>"] [--id <id>] [--csv-dir <csv-dir>]`.
4. Read the generated import report in `docs/powerbi-importer/reports/<id>.import-report.md` and review `dashboards/<id>.dashboard.yaml` for any approximated layouts, formats, or placeholder DAX fields.
5. Run `npm run verify`.
6. Summarize: the spec path, fixture row count, mapped vs approximated vs skipped counts, key DAX/visual items needing manual follow-up, and how to preview it (`npm run dev`, then `#/d/<id>`).
