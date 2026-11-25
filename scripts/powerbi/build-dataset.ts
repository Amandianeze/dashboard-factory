/** Build denormalized fixture rows from exported CSVs (star-schema join) or deterministic seeded PRNG. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Row } from '../../src/data/transforms';
import type { DatasetColumnSpec, ReportEntry, TmdlModel } from './types';

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — deterministic PRNG matching scripts/generate-fixtures.ts. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RFC-4180-compatible CSV parser (no external runtime dependencies). */
export function parseCsv(text: string): Array<Record<string, string>> {
  const input = text
    .replace(/^\ufeff/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  const header = rows[0];
  if (!header) return [];
  const out: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    const vals = rows[r]!;
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]!] = vals[c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

function normalizeJoinKey(raw: string): string {
  const s = raw.trim();
  // Normalize timestamps like "2023-12-01 00:00:00" to "2023-12-01" for date joins
  const datePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return datePrefix ? datePrefix[1]! : s;
}

function coerceCsvValue(
  raw: string | undefined,
  type: DatasetColumnSpec['type'],
): string | number | null {
  if (raw === undefined || raw === '') return null;
  if (type === 'quantitative') {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  if (type === 'temporal') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
    return m ? m[1]! : raw.trim();
  }
  return raw.trim();
}

const SAMPLE_POOLS: Array<[RegExp, string[]]> = [
  [/region/i, ['North', 'South', 'East', 'West']],
  [/country/i, ['Germany', 'France', 'United Kingdom', 'United States', 'Canada', 'Spain']],
  [/business.?line|category|line/i, ['Cloud', 'Cybersecurity', 'Data & AI', 'Software']],
  [/segment/i, ['Enterprise', 'Mid-Market', 'SMB', 'Public Sector']],
  [/product/i, ['Atlas', 'Beacon', 'Cobalt', 'Drift', 'Echo']],
  [
    /customer|contractor|account/i,
    ['QuantumMatrix', 'CyberSystems', 'SkyTech', 'NeuralSync', 'TechWave', 'NovaGrid'],
  ],
  [/year/i, ['2024', '2025']],
  [/month/i, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']],
  [/mode|status|class/i, ['Selected', 'Unselected']],
];

function syntheticCategoryValues(fieldName: string): string[] {
  for (const [re, pool] of SAMPLE_POOLS) {
    if (re.test(fieldName)) return pool;
  }
  return ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'];
}

function syntheticNumber(rand: () => number, col: DatasetColumnSpec): number {
  const lower = col.field.toLowerCase();
  if (
    lower.includes('margin') ||
    lower.includes('pct') ||
    lower.includes('rel') ||
    col.formatString?.includes('%')
  ) {
    const v = col.signed ? (rand() - 0.45) * 0.4 : 0.12 + rand() * 0.48;
    return Math.round(v * 1000) / 1000;
  }
  if (col.signed) {
    return Math.round((rand() - 0.45) * 8_000);
  }
  return Math.round(500 + rand() * 14_500);
}

/** Generate deterministic synthetic rows for all declared columns. */
export function generateSyntheticRows(
  seedKey: string,
  columns: Map<string, DatasetColumnSpec>,
  rowCount = 144,
): Row[] {
  const rand = mulberry32(hashString(seedKey));
  const cols = [...columns.values()];
  const startUtc = Date.UTC(2025, 0, 1);
  const pools = new Map<string, string[]>();
  for (const c of cols) {
    if (c.type === 'nominal' || c.type === 'ordinal') {
      pools.set(c.field, syntheticCategoryValues(c.field));
    }
  }

  const rows: Row[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Row = {};
    const monthIdx = i % 12;
    const monthDate = new Date(Date.UTC(2025, monthIdx, 1)).toISOString().slice(0, 10);
    const dayDate = new Date(startUtc + i * 86_400_000).toISOString().slice(0, 10);

    for (const c of cols) {
      if (c.type === 'temporal') {
        row[c.field] = /month/i.test(c.field) ? monthDate : dayDate;
      } else if (c.type === 'quantitative') {
        row[c.field] = syntheticNumber(rand, c);
      } else {
        const pool = pools.get(c.field) ?? ['Group A', 'Group B'];
        row[c.field] = pool[Math.floor(rand() * pool.length)]!;
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Build dataset rows: hydrate from `--csv-dir` via active TMDL M:1 relationships when available,
 * otherwise generate deterministic synthetic rows.
 */
export function buildDatasetRows(opts: {
  seedKey: string;
  model: TmdlModel;
  primaryFactTable?: string;
  columns: Map<string, DatasetColumnSpec>;
  csvDir?: string;
  mapped: ReportEntry[];
  approximated: ReportEntry[];
}): Row[] {
  const { seedKey, model, primaryFactTable, columns, csvDir, mapped, approximated } = opts;

  if (!csvDir || !primaryFactTable) {
    const rows = generateSyntheticRows(seedKey, columns);
    approximated.push({
      category: 'dataset',
      source: primaryFactTable ?? 'synthetic',
      target: `${rows.length} synthetic rows`,
      detail: 'generated deterministic fixture rows from TMDL column types (no --csv-dir supplied)',
    });
    return rows;
  }

  const factCsv = join(csvDir, `${primaryFactTable}.csv`);
  if (!existsSync(factCsv)) {
    const rows = generateSyntheticRows(seedKey, columns);
    approximated.push({
      category: 'dataset',
      source: factCsv,
      target: `${rows.length} synthetic rows`,
      detail: `fact CSV "${primaryFactTable}.csv" not found in --csv-dir; fell back to synthetic rows`,
    });
    return rows;
  }

  const factRows = parseCsv(readFileSync(factCsv, 'utf8'));
  const activeRels = model.relationships.filter(
    (r) => r.isActive && r.fromTable === primaryFactTable,
  );

  // Build dimension lookup tables for all active M:1 targets that have a CSV
  const dimLookups = new Map<
    string,
    { fromCol: string; lookup: Map<string, Record<string, string>> }
  >();
  for (const rel of activeRels) {
    const dimFile = join(csvDir, `${rel.toTable}.csv`);
    if (!existsSync(dimFile)) continue;
    const dimRows = parseCsv(readFileSync(dimFile, 'utf8'));
    const lookup = new Map<string, Record<string, string>>();
    for (const dr of dimRows) {
      const k = normalizeJoinKey(dr[rel.toColumn] ?? '');
      if (k && !lookup.has(k)) lookup.set(k, dr);
    }
    dimLookups.set(rel.toTable, { fromCol: rel.fromColumn, lookup });
  }

  const rand = mulberry32(hashString(seedKey));
  const cols = [...columns.values()];
  const out: Row[] = [];

  for (const fr of factRows) {
    const row: Row = {};
    for (const c of cols) {
      if (c.isPlaceholderMeasure) {
        row[c.field] = syntheticNumber(rand, c);
        continue;
      }
      if (c.sourceTable === primaryFactTable && c.sourceColumn in fr) {
        row[c.field] = coerceCsvValue(fr[c.sourceColumn], c.type);
        continue;
      }
      const dim = dimLookups.get(c.sourceTable);
      if (dim) {
        const key = normalizeJoinKey(fr[dim.fromCol] ?? '');
        const match = dim.lookup.get(key);
        if (match && c.sourceColumn in match) {
          row[c.field] = coerceCsvValue(match[c.sourceColumn], c.type);
          continue;
        }
      }
      // Fallback for unjoined or missing columns
      if (c.type === 'quantitative') row[c.field] = syntheticNumber(rand, c);
      else if (c.type === 'temporal') row[c.field] = '2025-01-01';
      else {
        const pool = syntheticCategoryValues(c.field);
        row[c.field] = pool[Math.floor(rand() * pool.length)]!;
      }
    }
    out.push(row);
  }

  mapped.push({
    category: 'dataset',
    source: `${primaryFactTable}.csv (+ ${dimLookups.size} joined dimension CSVs)`,
    target: `${out.length} rows`,
    detail: `hydrated via active TMDL relationships`,
  });
  return out;
}
