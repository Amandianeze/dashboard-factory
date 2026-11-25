/** Classify DAX measure expressions into placeholder, simple aggregate, unit-scaled, or complex. */
import type { AggregateOp, DaxClassification, TmdlMeasure, TmdlModel } from './types';
import { findMeasure } from './parse-tmdl';

const SIMPLE_FN_MAP: Record<string, AggregateOp> = {
  SUM: 'sum',
  AVERAGE: 'mean',
  MIN: 'min',
  MAX: 'max',
  COUNT: 'count',
  COUNTA: 'count',
  DISTINCTCOUNT: 'distinct',
};

/** Remove DAX single-line (-- or //) and block comments. */
export function stripDaxComments(expr: string): string {
  return expr
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .trim();
}

const COL_REF_PATTERN = /(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\[([^\]]+)\]/;
const SIMPLE_AGG_RE = new RegExp(
  `^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|DISTINCTCOUNT)\\s*\\(\\s*${COL_REF_PATTERN.source}\\s*\\)$`,
  'i',
);
const COUNTROWS_RE = /^COUNTROWS\s*\(\s*(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\s*\)$/i;
const DIVIDE_SIMPLE_RE = new RegExp(
  `^DIVIDE\\s*\\(\\s*(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|DISTINCTCOUNT)\\s*\\(\\s*${COL_REF_PATTERN.source}\\s*\\)\\s*,\\s*(\\[[^\\]]+\\]|10+)(?:\\s*,\\s*[^)]+)?\\s*\\)$`,
  'i',
);
const SLASH_SIMPLE_RE = new RegExp(
  `^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|DISTINCTCOUNT)\\s*\\(\\s*${COL_REF_PATTERN.source}\\s*\\)\\s*\\/\\s*(\\[[^\\]]+\\]|10+)$`,
  'i',
);

const PLACEHOLDER_NAME_RE = /\b(placeholder|data\s*bar|fx\s*color|blank\s*v\d|unichar|spacer)\b/i;

function isPlaceholderExpression(name: string, cleaned: string): string | null {
  if (!cleaned) return 'empty DAX expression';
  if (/^BLANK\s*\(\s*\)$/i.test(cleaned)) return 'BLANK() placeholder measure';
  if (/^""$/.test(cleaned) || /^0(?:\.0+)?$/.test(cleaned)) return 'constant spacer measure';
  if (/^"#[0-9a-f]{3,8}"$/i.test(cleaned)) return 'hex colour helper measure';
  if (/data:image\/svg\+xml/i.test(cleaned)) return 'SVG visual-hack measure';
  if (/UNICHAR\s*\(/i.test(cleaned) && PLACEHOLDER_NAME_RE.test(name)) {
    return 'UNICHAR spacer/bar visual-hack measure';
  }
  if (
    PLACEHOLDER_NAME_RE.test(name) &&
    (/REPT\s*\(/i.test(cleaned) ||
      /"#[0-9a-f]{3,8}"/i.test(cleaned) ||
      /BLANK\s*\(\s*\)/i.test(cleaned))
  ) {
    return `visual helper measure "${name}"`;
  }
  return null;
}

function isUnitDenominator(denomToken: string): boolean {
  if (/^10+$/.test(denomToken.trim())) return true;
  return /denom|unit|scale|divisor|thousand|million/i.test(denomToken);
}

/** Trace up to 2 hops through referenced [Measure]s to find an underlying fact table/column. */
function traceBaseColumn(
  cleaned: string,
  model?: TmdlModel,
  depth = 0,
  seen = new Set<string>(),
): { table: string; column: string } | undefined {
  const direct = COL_REF_PATTERN.exec(cleaned);
  if (direct) {
    const table = (direct[1] ?? direct[2])!;
    const column = direct[3]!;
    if (!table.startsWith('TBL') && !table.startsWith('FP ') && !table.startsWith('NR')) {
      return { table, column };
    }
  }
  if (!model || depth >= 2) return undefined;

  const measureRefs = [...cleaned.matchAll(/(?<![A-Za-z0-9_'])\[([^\]]+)\]/g)].map((m) => m[1]!);
  for (const refName of measureRefs) {
    if (seen.has(refName)) continue;
    seen.add(refName);
    const target = findMeasure(model, refName);
    if (!target) continue;
    const sub = stripDaxComments(target.expression);
    const traced = traceBaseColumn(sub, model, depth + 1, seen);
    if (traced) return traced;
  }
  return undefined;
}

/** Classify a DAX measure for mapping into DashboardSpec. */
export function classifyDaxMeasure(measure: TmdlMeasure, model?: TmdlModel): DaxClassification {
  const cleaned = stripDaxComments(measure.expression);

  // 1. Visual placeholder / SVG / colour helper
  const phReason = isPlaceholderExpression(measure.name, cleaned);
  if (phReason) return { kind: 'placeholder', reason: phReason };

  // 2. Simple aggregation: SUM(Table[Col]), AVERAGE(...), DISTINCTCOUNT(...)
  const simple = SIMPLE_AGG_RE.exec(cleaned);
  if (simple) {
    const fn = simple[1]!.toUpperCase();
    const table = (simple[2] ?? simple[3])!;
    const column = simple[4]!;
    return { kind: 'simple', table, column, aggregate: SIMPLE_FN_MAP[fn]! };
  }

  // 2b. COUNTROWS(Table)
  const cr = COUNTROWS_RE.exec(cleaned);
  if (cr) {
    const table = (cr[1] ?? cr[2])!;
    const tDef = model?.tables.get(table);
    const keyCol =
      tDef &&
      ([...tDef.columns.values()].find((c) => c.isKey)?.name ??
        [...tDef.columns.values()][0]?.name);
    if (keyCol) {
      return { kind: 'simple', table, column: keyCol, aggregate: 'count' };
    }
  }

  // 3. Unit-scaled wrapper: DIVIDE(SUM(Table[Col]), [_Denominator]) or SUM(Table[Col]) / 1000
  const divMatch = DIVIDE_SIMPLE_RE.exec(cleaned) ?? SLASH_SIMPLE_RE.exec(cleaned);
  if (divMatch) {
    const fn = divMatch[1]!.toUpperCase();
    const table = (divMatch[2] ?? divMatch[3])!;
    const column = divMatch[4]!;
    const denom = divMatch[5]!;
    if (isUnitDenominator(denom)) {
      return {
        kind: 'unit-scaled',
        table,
        column,
        aggregate: SIMPLE_FN_MAP[fn]!,
        reason: `unit-scaling denominator ${denom} dropped; use d3-format compact scaling instead`,
      };
    }
  }

  // 4. Complex DAX (time intelligence, CALCULATE, VAR, SWITCH, ratios, etc.)
  const traced = traceBaseColumn(cleaned, model);
  const reasons: string[] = [];
  if (
    /\b(SAMEPERIODLASTYEAR|DATEADD|DATESYTD|TOTALYTD|PARALLELPERIOD|PREVIOUSYEAR)\b/i.test(cleaned)
  ) {
    reasons.push('time intelligence');
  }
  if (/\bCALCULATE\b/i.test(cleaned)) reasons.push('CALCULATE filter context');
  if (/\bSWITCH\b/i.test(cleaned)) reasons.push('SWITCH branching');
  if (/\bVAR\b/i.test(cleaned)) reasons.push('multi-step VAR/RETURN');
  if (/\bDIVIDE\b/i.test(cleaned) && reasons.length === 0) reasons.push('ratio/division');
  if (reasons.length === 0) reasons.push('non-trivial DAX expression');

  return {
    kind: 'complex',
    reason: reasons.join(', '),
    expression: cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned,
    tracedTable: traced?.table,
    tracedColumn: traced?.column,
  };
}
