#!/usr/bin/env python3
"""
Optional pre-converter: convert .pbix files to Power BI Project (.pbip) format on macOS/Linux.

Requires Python 3.10+ with `pbixray` installed (`pip install pbixray`).
Not required by `npm run verify` or CI; the TypeScript importer (`npm run import:powerbi`)
consumes `.pbip` folders directly.

Usage:
  python3 scripts/powerbi/pbix_to_pbip.py <input.pbix-or-dir> <output-dir> [--export-csv]
"""

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path
from urllib.parse import quote

try:
    import pandas as pd
    from pbixray import PBIXRay
except ImportError as exc:
    sys.stderr.write(
        "Missing dependency: install pbixray in a virtual environment first:\n"
        "  python3 -m venv .venv && .venv/bin/pip install pbixray\n"
        f"Details: {exc}\n"
    )
    sys.exit(1)

DATA_TYPE_MAP = {
    2: "string",
    6: "int64",
    8: "double",
    9: "dateTime",
    10: "decimal",
    11: "boolean",
    17: "binary",
    19: "variant",
}

SUMMARIZE_BY_MAP = {
    1: None,
    2: "none",
    3: "sum",
    4: "min",
    5: "max",
    6: "count",
    7: "average",
    8: "distinctCount",
}

PARTITION_MODE_MAP = {
    0: "import",
    1: "directQuery",
    2: "dual",
    3: "push",
    4: "directLake",
}

CARDINALITY_MAP = {1: "one", 2: "many"}
CROSS_FILTER_MAP = {1: "oneDirection", 2: "bothDirections", 3: "automatic"}


def is_null(val) -> bool:
    if val is None:
        return True
    try:
        return bool(pd.isna(val))
    except Exception:
        return False


def tmdl_ident(name: str) -> str:
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        return name
    return "'" + name.replace("'", "''") + "'"


def tmdl_filename(name: str) -> str:
    forbidden = set('/\\:*?"<>|')
    out = [quote(ch, safe="") if (ch in forbidden or ord(ch) < 32) else ch for ch in name]
    return "".join(out).strip() or "Table"


def format_tmdl_expr(expr: str, indent: str) -> list[str]:
    if expr is None or is_null(expr):
        return []
    text = str(expr).replace("\r\n", "\n").replace("\r", "\n")
    if "\n" not in text and not text.startswith(" ") and not text.endswith(" ") and "```" not in text:
        return [text]
    lines = ["```"]
    for line in text.split("\n"):
        lines.append(f"{indent}{line}" if line else "")
    lines.append(f"{indent}```")
    return lines


def format_tmdl_string_prop(prop: str, val: str, indent: str) -> str:
    return f"{indent}{prop}: {str(val).replace(chr(13), '').replace(chr(10), ' ')}"


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def emit_report(zf: zipfile.ZipFile, report_dir: Path, project_name: str) -> dict:
    names = zf.namelist()
    if "Report/definition/report.json" in names:
        write_json(
            report_dir / "definition.pbir",
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
                "version": "4.0",
                "datasetReference": {"byPath": {"path": f"../{project_name}.SemanticModel"}},
            },
        )
        json_count = 0
        asset_count = 0
        for entry in names:
            if not entry.startswith("Report/") or entry.endswith("/"):
                continue
            rel = entry[len("Report/"):]
            if rel == "LinguisticSchema":
                continue
            dest = report_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            raw = zf.read(entry)
            if rel.startswith("definition/") and rel.endswith(".json"):
                try:
                    parsed = json.loads(raw.decode("utf-8-sig"))
                    write_json(dest, parsed)
                    json_count += 1
                    continue
                except Exception:
                    pass
            dest.write_bytes(raw)
            asset_count += 1
        return {"format": "PBIR v2.0.0", "json_files": json_count, "asset_files": asset_count}

    if "Report/Layout" in names:
        write_json(
            report_dir / "definition.pbir",
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/1.0.0/schema.json",
                "version": "1.0",
                "datasetReference": {"byPath": {"path": f"../{project_name}.SemanticModel"}},
            },
        )
        layout_json = json.loads(zf.read("Report/Layout").decode("utf-16-le"))
        write_json(report_dir / "report.json", layout_json)
        asset_count = 0
        for entry in names:
            if not entry.startswith("Report/") or entry.endswith("/"):
                continue
            rel = entry[len("Report/"):]
            if rel in ("Layout", "LinguisticSchema"):
                continue
            dest = report_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(zf.read(entry))
            asset_count += 1
        return {
            "format": "PBIR-Legacy (v1.0)",
            "sections": len(layout_json.get("sections", [])),
            "asset_files": asset_count,
        }

    raise ValueError("PBIX contains neither Report/definition/report.json nor Report/Layout")


def emit_semantic_model(pbix_path: Path, zf: zipfile.ZipFile, sm_dir: Path, csv_dir: Path | None) -> dict:
    write_json(
        sm_dir / "definition.pbism",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
            "version": "4.2",
            "settings": {},
        },
    )

    if "DiagramLayout" in zf.namelist():
        try:
            write_json(sm_dir / "diagramLayout.json", json.loads(zf.read("DiagramLayout").decode("utf-16-le")))
        except Exception:
            pass

    for entry in zf.namelist():
        if entry.startswith("TMDLScripts/") and not entry.endswith("/"):
            raw = zf.read(entry)
            dest = sm_dir / entry
            dest.parent.mkdir(parents=True, exist_ok=True)
            if entry.endswith(".tmdl"):
                try:
                    text = raw.decode("utf-16-le")
                except Exception:
                    text = raw.decode("utf-8", errors="replace")
                dest.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
            elif entry.endswith(".json"):
                for enc in ("utf-8-sig", "utf-16-le", "utf-16"):
                    try:
                        write_json(dest, json.loads(raw.decode(enc)))
                        break
                    except Exception:
                        continue
                else:
                    dest.write_bytes(raw)
            else:
                dest.write_bytes(raw)

    model = PBIXRay(str(pbix_path))
    try:
        db = model._metadata._meta._db
        model_df = db.query("SELECT * FROM Model")
        tables_df = db.query('SELECT * FROM "Table"')
        cols_df = db.query('SELECT * FROM "Column"')
        measures_df = db.query("SELECT * FROM Measure")
        rels_df = db.query("SELECT * FROM Relationship")
        parts_df = db.query("SELECT * FROM Partition")
        try:
            cg_df = db.query("SELECT * FROM CalculationGroup")
            ci_df = db.query("SELECT * FROM CalculationItem")
        except Exception:
            cg_df, ci_df = pd.DataFrame(), pd.DataFrame()
        try:
            fsd_df = db.query("SELECT * FROM FormatStringDefinition")
        except Exception:
            fsd_df = pd.DataFrame()

        def_dir = sm_dir / "definition"
        tables_dir = def_dir / "tables"
        tables_dir.mkdir(parents=True, exist_ok=True)
        write_text(def_dir / "database.tmdl", "database\n\tcompatibilityLevel: 1567\n")

        fsd_by_id = {row["ID"]: row["Expression"] for _, row in fsd_df.iterrows()} if len(fsd_df) else {}
        user_tables = tables_df[tables_df["SystemFlags"] != 1].copy()
        table_id_to_name = dict(zip(tables_df["ID"], tables_df["Name"]))
        col_id_to_name = {}
        for _, crow in cols_df.iterrows():
            cname = crow["ExplicitName"] if not is_null(crow["ExplicitName"]) else crow["InferredName"]
            if not is_null(cname):
                col_id_to_name[crow["ID"]] = str(cname)

        mrow = model_df.iloc[0] if len(model_df) else {}
        culture = mrow.get("Culture", "en-US") if hasattr(mrow, "get") else "en-US"
        if is_null(culture):
            culture = "en-US"
        model_lines = ["model Model", f"\tculture: {culture}", "\tdefaultPowerBIDataSourceVersion: powerBI_V3", ""]
        for _, trow in user_tables.sort_values("Name").iterrows():
            model_lines.append(f"ref table {tmdl_ident(str(trow['Name']))}")
        write_text(def_dir / "model.tmdl", "\n".join(model_lines) + "\n")

        rel_lines = []
        valid_table_ids = set(user_tables["ID"].tolist())
        rel_count = 0
        for _, rrow in rels_df.iterrows():
            if rrow["FromTableID"] not in valid_table_ids or rrow["ToTableID"] not in valid_table_ids:
                continue
            ft = table_id_to_name.get(rrow["FromTableID"])
            tt = table_id_to_name.get(rrow["ToTableID"])
            fc = col_id_to_name.get(rrow["FromColumnID"])
            tc = col_id_to_name.get(rrow["ToColumnID"])
            if not (ft and tt and fc and tc):
                continue
            rname = str(rrow["Name"]) if not is_null(rrow["Name"]) else f"rel_{rrow['ID']}"
            rel_lines.append(f"relationship {tmdl_ident(rname)}")
            if not is_null(rrow["IsActive"]) and int(rrow["IsActive"]) == 0:
                rel_lines.append("\tisActive: false")
            cfb = CROSS_FILTER_MAP.get(int(rrow["CrossFilteringBehavior"])) if not is_null(rrow["CrossFilteringBehavior"]) else None
            if cfb and cfb != "oneDirection":
                rel_lines.append(f"\tcrossFilteringBehavior: {cfb}")
            fcard = CARDINALITY_MAP.get(int(rrow["FromCardinality"])) if not is_null(rrow["FromCardinality"]) else None
            tcard = CARDINALITY_MAP.get(int(rrow["ToCardinality"])) if not is_null(rrow["ToCardinality"]) else None
            if fcard and fcard != "many":
                rel_lines.append(f"\tfromCardinality: {fcard}")
            if tcard and tcard != "one":
                rel_lines.append(f"\ttoCardinality: {tcard}")
            rel_lines.append(f"\tfromColumn: {tmdl_ident(ft)}.{tmdl_ident(fc)}")
            rel_lines.append(f"\ttoColumn: {tmdl_ident(tt)}.{tmdl_ident(tc)}")
            rel_lines.append("")
            rel_count += 1
        if rel_lines:
            write_text(def_dir / "relationships.tmdl", "\n".join(rel_lines))

        table_count = measure_count = col_count = 0
        used_filenames: set[str] = set()
        for _, trow in user_tables.sort_values("Name").iterrows():
            tid = trow["ID"]
            tname = str(trow["Name"])
            lines = [f"table {tmdl_ident(tname)}"]
            if not is_null(trow.get("IsHidden")) and int(trow["IsHidden"]) == 1:
                lines.append("\tisHidden")
            if not is_null(trow.get("LineageTag")) and str(trow["LineageTag"]).strip():
                lines.append(f"\tlineageTag: {trow['LineageTag']}")
            lines.append("")

            if len(cg_df) and not is_null(trow.get("CalculationGroupID")):
                cg_rows = cg_df[cg_df["ID"] == trow["CalculationGroupID"]]
                if len(cg_rows):
                    cg = cg_rows.iloc[0]
                    lines.append("\tcalculationGroup")
                    if not is_null(cg.get("Precedence")):
                        lines.append(f"\t\tprecedence: {int(cg['Precedence'])}")
                    lines.append("")
                    items = ci_df[ci_df["CalculationGroupID"] == cg["ID"]].sort_values("Ordinal") if len(ci_df) else pd.DataFrame()
                    for _, item in items.iterrows():
                        expr_lines = format_tmdl_expr(item.get("Expression"), "\t\t\t")
                        head = expr_lines[0] if expr_lines else "SELECTEDMEASURE()"
                        lines.append(f"\t\tcalculationItem {tmdl_ident(str(item['Name']))} = {head}")
                        lines.extend(expr_lines[1:])
                        lines.append("")

            for _, mitem in measures_df[measures_df["TableID"] == tid].iterrows():
                expr_lines = format_tmdl_expr(mitem.get("Expression"), "\t\t")
                head = expr_lines[0] if expr_lines else "BLANK()"
                lines.append(f"\tmeasure {tmdl_ident(str(mitem['Name']))} = {head}")
                lines.extend(expr_lines[1:])
                if not is_null(mitem.get("FormatString")) and str(mitem["FormatString"]).strip():
                    lines.append(format_tmdl_string_prop("formatString", mitem["FormatString"], "\t\t"))
                fsd_id = mitem.get("FormatStringDefinitionID")
                if not is_null(fsd_id) and fsd_id in fsd_by_id:
                    fexpr = format_tmdl_expr(fsd_by_id[fsd_id], "\t\t\t")
                    if fexpr:
                        lines.append(f"\t\tformatStringDefinition = {fexpr[0]}")
                        lines.extend(fexpr[1:])
                if not is_null(mitem.get("DisplayFolder")) and str(mitem["DisplayFolder"]).strip():
                    lines.append(format_tmdl_string_prop("displayFolder", mitem["DisplayFolder"], "\t\t"))
                if not is_null(mitem.get("IsHidden")) and int(mitem["IsHidden"]) == 1:
                    lines.append("\t\tisHidden")
                lines.append("")
                measure_count += 1

            for _, citem in cols_df[(cols_df["TableID"] == tid) & (cols_df["Type"] != 3)].iterrows():
                cname = citem["ExplicitName"] if not is_null(citem["ExplicitName"]) else citem["InferredName"]
                if is_null(cname):
                    continue
                ctype = int(citem["Type"]) if not is_null(citem["Type"]) else 1
                if ctype == 2 and not is_null(citem.get("Expression")):
                    expr_lines = format_tmdl_expr(citem["Expression"], "\t\t")
                    lines.append(f"\tcolumn {tmdl_ident(str(cname))} = {expr_lines[0]}")
                    lines.extend(expr_lines[1:])
                else:
                    lines.append(f"\tcolumn {tmdl_ident(str(cname))}")
                edt = int(citem["ExplicitDataType"]) if not is_null(citem["ExplicitDataType"]) else 1
                idt = int(citem["InferredDataType"]) if not is_null(citem["InferredDataType"]) else 1
                dt_name = DATA_TYPE_MAP.get(edt if edt in DATA_TYPE_MAP else idt)
                if dt_name:
                    lines.append(f"\t\tdataType: {dt_name}")
                if not is_null(citem.get("IsHidden")) and int(citem["IsHidden"]) == 1:
                    lines.append("\t\tisHidden")
                if not is_null(citem.get("IsKey")) and int(citem["IsKey"]) == 1:
                    lines.append("\t\tisKey")
                if not is_null(citem.get("FormatString")) and str(citem["FormatString"]).strip():
                    lines.append(format_tmdl_string_prop("formatString", citem["FormatString"], "\t\t"))
                if not is_null(citem.get("SummarizeBy")):
                    sb = SUMMARIZE_BY_MAP.get(int(citem["SummarizeBy"]))
                    if sb:
                        lines.append(f"\t\tsummarizeBy: {sb}")
                if ctype in (1, 4) and not is_null(citem.get("SourceColumn")) and str(citem["SourceColumn"]).strip():
                    lines.append(f"\t\tsourceColumn: {citem['SourceColumn']}")
                lines.append("")
                col_count += 1

            for _, pitem in parts_df[parts_df["TableID"] == tid].iterrows():
                ptype = int(pitem["Type"]) if not is_null(pitem["Type"]) else 4
                pmode = PARTITION_MODE_MAP.get(int(pitem["Mode"]), "import") if not is_null(pitem["Mode"]) else "import"
                kind = {7: "calculationGroup", 2: "calculated", 4: "m"}.get(ptype)
                if not kind:
                    continue
                lines.append(f"\tpartition {tmdl_ident(str(pitem['Name']))} = {kind}")
                lines.append(f"\t\tmode: {pmode}")
                if kind != "calculationGroup" and not is_null(pitem.get("QueryDefinition")):
                    expr_lines = format_tmdl_expr(pitem["QueryDefinition"], "\t\t\t")
                    if expr_lines:
                        lines.append(f"\t\tsource = {expr_lines[0]}")
                        lines.extend(expr_lines[1:])
                lines.append("")

            fname = tmdl_filename(tname)
            base_fname = fname
            suffix = 1
            while fname.lower() in used_filenames:
                fname = f"{base_fname}_{suffix}"
                suffix += 1
            used_filenames.add(fname.lower())
            write_text(tables_dir / f"{fname}.tmdl", "\n".join(lines).rstrip() + "\n")
            table_count += 1

        exported_csvs = 0
        if csv_dir is not None:
            csv_dir.mkdir(parents=True, exist_ok=True)
            for tname in model.tables:
                try:
                    df = model.get_table(tname)
                    if len(df) > 0:
                        df.to_csv(csv_dir / f"{tmdl_filename(tname)}.csv", index=False)
                        exported_csvs += 1
                except Exception:
                    continue

        return {
            "tables": table_count,
            "columns": col_count,
            "measures": measure_count,
            "relationships": rel_count,
            "exported_csvs": exported_csvs,
        }
    finally:
        model.close()


def convert_pbix(pbix_path: Path, out_root: Path, export_csv: bool) -> dict:
    project_name = pbix_path.stem
    project_dir = out_root / project_name
    if project_dir.exists():
        shutil.rmtree(project_dir)
    project_dir.mkdir(parents=True, exist_ok=True)

    write_json(
        project_dir / f"{project_name}.pbip",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
            "version": "1.0",
            "artifacts": [{"report": {"path": f"{project_name}.Report"}}],
            "settings": {"enableAutoRecovery": True},
        },
    )

    with zipfile.ZipFile(pbix_path, "r") as zf:
        rep_info = emit_report(zf, project_dir / f"{project_name}.Report", project_name)
        csv_dir = (project_dir / "csv") if export_csv else None
        sm_info = emit_semantic_model(pbix_path, zf, project_dir / f"{project_name}.SemanticModel", csv_dir)

    return {
        "project": project_name,
        "pbip_file": str(project_dir / f"{project_name}.pbip"),
        "report": rep_info,
        "semantic_model": sm_info,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert .pbix file(s) to .pbip folders.")
    parser.add_argument("input", help="Path to a .pbix file or a directory of .pbix files")
    parser.add_argument("output", help="Output directory for converted .pbip project folder(s)")
    parser.add_argument("--export-csv", action="store_true", help="Also export model tables as CSVs under <project>/csv/")
    args = parser.parse_args()

    src = Path(args.input).resolve()
    out = Path(args.output).resolve()
    files = [src] if src.is_file() else sorted(src.glob("*.pbix"))
    if not files:
        raise SystemExit(f"No .pbix files found at {src}")

    results = [convert_pbix(f, out, args.export_csv) for f in files]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
