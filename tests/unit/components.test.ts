import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { listSpecFiles } from '../../scripts/lib/specs';
import { sortRows } from '../../src/components/panels/data-table';
import { computeDeltas } from '../../src/components/panels/kpi-value';
import { deltaTone } from '../../src/components/ui/delta-indicator';
import { validateDashboard } from '../../src/spec/validate';

describe('KPI comparison maths (kpi-value)', () => {
  it('derives delta and delta % from current and previous', () => {
    const { delta, deltaPct } = computeDeltas(7720.39, 7743.98);
    expect(delta).toBeCloseTo(-23.59, 2);
    expect(deltaPct).toBeCloseTo(-0.003046, 5);
  });
  it('gives no percentage against zero, and nothing when a value is missing', () => {
    expect(computeDeltas(5, 0)).toEqual({ delta: 5, deltaPct: null });
    expect(computeDeltas(NaN, 3)).toEqual({ delta: null, deltaPct: null });
    expect(computeDeltas(3, null)).toEqual({ delta: null, deltaPct: null });
  });
  it('divides by |previous| so a rise from a negative base reads as up', () => {
    expect(computeDeltas(-5, -10).deltaPct).toBeCloseTo(0.5);
  });
});

describe('delta colour role (delta-indicator)', () => {
  it('follows sign × polarity, and zero is neutral', () => {
    expect(deltaTone(2)).toBe('good');
    expect(deltaTone(-2)).toBe('bad');
    expect(deltaTone(2, 'down-is-good')).toBe('bad');
    expect(deltaTone(-2, 'down-is-good')).toBe('good');
    expect(deltaTone(0)).toBe('neutral');
    expect(deltaTone(5, 'neutral')).toBe('neutral');
  });
});

describe('table sorting (data-table)', () => {
  const rows = [
    { name: 'b', n: 2 },
    { name: 'A', n: 10 },
    { name: 'c', n: null },
    { name: 'a2', n: 2 },
  ];
  it('sorts numbers numerically, keeps ties stable and puts blanks last', () => {
    expect(sortRows(rows, { field: 'n', order: 'desc' }).map((r) => r.name)).toEqual([
      'A',
      'b',
      'a2',
      'c',
    ]);
    expect(sortRows(rows, { field: 'n', order: 'asc' }).map((r) => r.name)).toEqual([
      'b',
      'a2',
      'A',
      'c',
    ]);
  });
  it('sorts text with a case-insensitive, numeric-aware collator', () => {
    expect(sortRows(rows, { field: 'name', order: 'asc' }).map((r) => r.name)).toEqual([
      'A',
      'a2',
      'b',
      'c',
    ]);
  });
  it('leaves rows alone without a sort', () => {
    expect(sortRows(rows, undefined)).toBe(rows);
  });
});

describe('spec rules for the new panel options', () => {
  const load = (id: string) =>
    parse(
      readFileSync(
        listSpecFiles().find((f) => f.includes(id))!,
        'utf8',
      ),
    );
  const errorsFor = (spec: unknown) => {
    const r = validateDashboard(spec);
    return r.ok ? '' : r.errors.join('\n');
  };

  it('rejects a comparison against an undeclared or non-numeric field, or with count', () => {
    const s = load('sp500-today');
    s.panels.close.comparison.compareTo.field = 'nope';
    expect(errorsFor(s)).toMatch(/field "nope" is not declared/);
    const t = load('sp500-today');
    t.panels.close.aggregate = 'count';
    expect(errorsFor(t)).toMatch(/comparison needs sum, mean, min or max/);
  });

  it('accepts a table panel and checks its columns and sort', () => {
    const s = load('revenue-overview');
    s.panels.by_product = {
      title: 'Products',
      dataset: 'sales',
      kind: 'data-table',
      renderer: 'table',
      columns: [{ field: 'product' }, { field: 'revenue', format: '$,.0f' }],
      sort: { field: 'revenue', order: 'desc' },
    };
    expect(errorsFor(s)).toBe('');
    s.panels.by_product.columns.push({ field: 'ghost' });
    s.panels.by_product.sort.field = 'region';
    const errors = errorsFor(s);
    expect(errors).toMatch(/field "ghost" is not declared/);
    expect(errors).toMatch(/sort field "region" is not a column/);
  });

  it('only allows the table renderer with kind data-table', () => {
    const s = load('revenue-overview');
    s.panels.trend.kind = 'data-table';
    expect(errorsFor(s)).toMatch(/kind "data-table" renders with table, not "vega-lite"/);
  });
});
