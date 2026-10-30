import { describe, expect, it } from 'vitest';
import { aggregate, applyFilters, distinctValues, groupAggregate } from '../../src/data/transforms';
import { buildPlotlyFigure } from '../../src/renderers/plotlyFigure';
import type { FilterSpec, PlotlyPanel } from '../../src/spec/types';

const rows = [
  { region: 'North', product: 'A', revenue: 10, orders: 1 },
  { region: 'North', product: 'B', revenue: 30, orders: 2 },
  { region: 'South', product: 'A', revenue: 20, orders: 3 },
];

const regionFilter: FilterSpec = {
  id: 'region',
  label: 'Region',
  type: 'multiselect',
  dataset: 'sales',
  field: 'region',
  appliesTo: ['p1'],
};

describe('applyFilters', () => {
  it('filters only panels the filter applies to', () => {
    expect(applyFilters(rows, 'p1', [regionFilter], { region: ['South'] })).toHaveLength(1);
    expect(applyFilters(rows, 'p2', [regionFilter], { region: ['South'] })).toHaveLength(3);
  });
  it('treats an empty selection as no filter', () => {
    expect(applyFilters(rows, 'p1', [regionFilter], { region: [] })).toBe(rows);
  });
});

describe('aggregate', () => {
  it.each([
    ['sum', 60],
    ['mean', 20],
    ['min', 10],
    ['max', 30],
    ['count', 3],
  ] as const)('%s', (op, expected) => expect(aggregate(rows, 'revenue', op)).toBe(expected));
  it('distinct', () => expect(aggregate(rows, 'region', 'distinct')).toBe(2));
  it('returns NaN for no numeric values', () => expect(aggregate([], 'revenue', 'sum')).toBeNaN());
});

describe('groupAggregate / distinctValues', () => {
  it('groups and sums', () => {
    expect(groupAggregate(rows, ['product'], 'revenue', 'sum')).toEqual([
      { product: 'A', revenue: 30 },
      { product: 'B', revenue: 30 },
    ]);
  });
  it('sorts distinct values', () =>
    expect(distinctValues(rows, 'region')).toEqual(['North', 'South']));
});

describe('buildPlotlyFigure', () => {
  const panel: PlotlyPanel = {
    title: 't',
    dataset: 'sales',
    renderer: 'plotly',
    trace: { type: 'bar', x: 'product', y: 'revenue', groupBy: 'region', aggregate: 'sum' },
    layout: {},
  };
  it('creates one trace per group with aggregated values', () => {
    const { data, layout } = buildPlotlyFigure(panel, rows);
    expect(data.map((d) => (d as { name: string }).name)).toEqual(['North', 'South']);
    expect((data[0] as { y: number[] }).y).toEqual([10, 30]);
    expect(layout.showlegend).toBe(true);
  });
});
