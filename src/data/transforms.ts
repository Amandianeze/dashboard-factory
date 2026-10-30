/** Pure data helpers shared by every renderer. Keep these framework-free and unit-tested. */
import type { FilterSpec, KpiPanel } from '../spec/types';

export type Row = Record<string, unknown>;
/** filter id → selected values; an empty or missing array means "no filter". */
export type FilterState = Record<string, string[]>;

export function applyFilters(
  rows: Row[],
  panelId: string,
  filters: FilterSpec[],
  state: FilterState,
): Row[] {
  const active = filters.filter((f) => f.appliesTo.includes(panelId) && state[f.id]?.length);
  if (!active.length) return rows;
  return rows.filter((r) => active.every((f) => state[f.id]!.includes(String(r[f.field]))));
}

export function distinctValues(rows: Row[], field: string): string[] {
  return [...new Set(rows.map((r) => String(r[field])))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

export function aggregate(rows: Row[], field: string, op: KpiPanel['aggregate'] | 'count'): number {
  if (op === 'count') return rows.length;
  if (op === 'distinct') return new Set(rows.map((r) => r[field])).size;
  const values = rows.map((r) => num(r[field])).filter((v) => Number.isFinite(v));
  if (!values.length) return NaN;
  switch (op) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'mean':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
  }
}

/** Group rows by `keys` and aggregate `field` per group. Groups keep first-seen order. */
export function groupAggregate(
  rows: Row[],
  keys: string[],
  field: string,
  op: 'sum' | 'mean' | 'count',
): Row[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = JSON.stringify(keys.map((key) => r[key]));
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.values()].map((g) => {
    const out: Row = {};
    keys.forEach((key) => (out[key] = g[0]![key]));
    out[field] = aggregate(g, field, op);
    return out;
  });
}
