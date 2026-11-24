import { View, parse } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';
import { describe, expect, it } from 'vitest';
import { checkSpecFile, listSpecFiles, loadFixture } from '../../scripts/lib/specs';
import { d3Charts, isD3ChartName } from '../../src/components/d3/charts';
import {
  exactFormat,
  fieldLabel,
  sourceData,
  summarize,
  type ChartData,
} from '../../src/data/chartData';
import { aggregate, type Row } from '../../src/data/transforms';
import { buildFlintSpec } from '../../src/renderers/flintSpec';
import { buildPlotlyFigure, plotlyChartData } from '../../src/renderers/plotlyFigure';
import { buildVegaLiteSpec } from '../../src/renderers/vegaLiteSpec';
import { vegaChartData } from '../../src/renderers/vegaChartData';
import type { PanelSpec } from '../../src/spec/types';

/** Run the real compiler and dataflow, as the browser does, then read what was drawn. */
async function fromVega(spec: object): Promise<ChartData | null> {
  const compiled = compile(spec as TopLevelSpec).spec;
  const view = new View(parse(compiled), { renderer: 'none' });
  await view.runAsync();
  const data = vegaChartData(spec, compiled, (name) => view.data(name) as Row[]);
  view.finalize();
  return data;
}

function panelOf(id: string) {
  for (const file of listSpecFiles()) {
    const spec = checkSpecFile(file).spec!;
    const panel = spec.panels[id];
    if (!panel) continue;
    const dataset = spec.datasets[panel.dataset]!;
    if (dataset.source !== 'fixture') throw new Error('fixture expected');
    return { panel, dataset, rows: loadFixture(dataset.path) as Row[] };
  }
  throw new Error(`no panel ${id}`);
}

async function drawnBy(id: string): Promise<ChartData | null> {
  const { panel, dataset, rows } = panelOf(id);
  const p: PanelSpec = panel;
  const size = { width: 600, height: 300 };
  switch (p.renderer) {
    case 'vega-lite':
      return fromVega({ ...buildVegaLiteSpec(p, rows), ...size });
    case 'flint':
      return fromVega(buildFlintSpec(p, rows, dataset.semantics, size));
    case 'plotly':
      return plotlyChartData(p, buildPlotlyFigure(p, rows));
    case 'd3': {
      if (!isD3ChartName(p.component)) throw new Error(p.component);
      const entry = d3Charts[p.component];
      return entry.chartData(rows, entry.propsSchema.parse(p.props));
    }
    default:
      throw new Error(`${id} is not a chart`);
  }
}

const total = (data: ChartData, field: string) =>
  data.rows.reduce((sum, row) => sum + Number(row[field]), 0);

describe('every dashboard chart', () => {
  const charts = listSpecFiles().flatMap((file) =>
    Object.entries(checkSpecFile(file).spec!.panels)
      .filter(([, p]) => p.kind === 'chart-panel')
      .map(([id]) => id),
  );

  it.each(charts)('%s has a table of what it plots, not a fallback', async (id) => {
    const data = await drawnBy(id);
    expect(data?.from).toBe('plotted');
    expect(data?.rows.length).toBeGreaterThan(0);
    expect(summarize(data!)).not.toMatch(/NaN|undefined|Invalid|\[object/);
  });

  const revenue = aggregate(loadFixture('sales_daily.json') as Row[], 'revenue', 'sum');

  it('trend: weekly sums per region, labelled like the axis', async () => {
    const data = (await drawnBy('trend'))!;
    expect(data.rows).toHaveLength(68);
    expect(data.columns.map((c) => c.label)).toEqual(['Week', 'Region', 'Revenue']);
    expect(data.rows[0]!.utcyearweek_date).toBe('2026 W14');
    expect(data.columns[2]!.format).toBe('$,.0f');
    expect(total(data, 'sum_revenue')).toBeCloseTo(revenue);
  });

  it('heatmap: one row per cell, in dollars', async () => {
    const data = (await drawnBy('heatmap'))!;
    expect(data.rows).toHaveLength(16);
    expect(data.columns.map((c) => c.label)).toEqual(['Product', 'Region', 'Revenue']);
    expect(data.columns[2]!.format).toBe('$,.2~f');
    expect(total(data, 'revenue_sum')).toBeCloseTo(revenue);
  });

  it('by_product: the bars, with exact dollars', async () => {
    const data = (await drawnBy('by_product'))!;
    expect(data.rows).toHaveLength(4);
    expect(data.columns[1]!.format).toBe('$,.2~f');
    expect(total(data, 'value')).toBeCloseTo(revenue);
  });

  it('orders_vs_revenue: every point', async () => {
    const data = (await drawnBy('orders_vs_revenue'))!;
    expect(data.rows).toHaveLength(1904);
    expect(total(data, 'y')).toBeCloseTo(revenue);
  });

  it('intraday: all four prices per candle, at the time the axis shows', async () => {
    const data = (await drawnBy('intraday'))!;
    const bars = loadFixture('sp500_intraday.json') as Row[];
    expect(data.rows).toHaveLength(bars.length);
    const measures = data.columns.filter((c) => c.measure);
    expect(measures.map((c) => c.format)).toEqual([',.2f', ',.2f', ',.2f', ',.2f']);
    const { time, open, high, low, close } = bars[0]!;
    expect(data.rows[0]).toEqual({
      time: String(time).slice(0, 16).replace('T', ' '),
      open,
      high,
      low,
      close,
    });
  });
});

describe('vegaChartData', () => {
  const values = [
    { d: '2026-03-01', g: 'a', v: 3 },
    { d: '2026-04-15', g: 'b', v: 5 },
    { d: '2026-04-15', g: 'a', v: 7 },
    { d: '2026-04-15', g: 'a', v: null },
  ];
  const draw = (spec: object) => fromVega({ data: { values }, ...spec });

  it('histogram: bins and counts', async () => {
    const data = (await draw({
      mark: 'bar',
      encoding: { x: { field: 'v', bin: true }, y: { aggregate: 'count' } },
    }))!;
    expect(data.columns.map((c) => c.label)).toEqual(['V', 'Count']);
    expect(Object.values(data.rows[0]!)[0]).toMatch(/^\d[\d.]* to \d[\d.]*$/);
  });

  it('stacked bars: the segment, not its offsets', async () => {
    const data = (await draw({
      mark: 'bar',
      encoding: {
        x: { field: 'd', type: 'temporal' },
        y: { field: 'v', aggregate: 'sum' },
        color: { field: 'g' },
      },
    }))!;
    expect(data.rows).toContainEqual({ d: '2026-04-15', g: 'a', sum_v: 7 });
    expect(data.columns).toHaveLength(3);
  });

  it('pie: a row per slice', async () => {
    const data = (await draw({
      mark: 'arc',
      encoding: { theta: { field: 'v', aggregate: 'sum' }, color: { field: 'g' } },
    }))!;
    expect(data.rows).toContainEqual({ g: 'a', sum_v: 10 });
  });

  it('filters: only what is drawn', async () => {
    const data = (await draw({
      transform: [{ filter: 'datum.v > 4' }],
      mark: 'point',
      encoding: { x: { field: 'g' }, y: { field: 'v', type: 'quantitative' } },
    }))!;
    expect(data.rows).toHaveLength(2);
  });

  it('layers: reads past a reference line', async () => {
    const data = (await draw({
      layer: [
        { mark: 'bar', encoding: { x: { field: 'g' }, y: { field: 'v', aggregate: 'mean' } } },
        { mark: 'rule', encoding: { y: { datum: 4 } } },
      ],
    }))!;
    expect(data.rows).toEqual([
      { g: 'a', mean_v: 5 },
      { g: 'b', mean_v: 5 },
    ]);
  });

  it('facets: the facet is a column', async () => {
    const data = (await draw({
      mark: 'bar',
      encoding: {
        column: { field: 'g' },
        x: { field: 'd', timeUnit: 'utcyearmonth' },
        y: { field: 'v', aggregate: 'sum' },
      },
    }))!;
    expect(data.rows).toContainEqual({ g: 'a', utcyearmonth_d: '2026-04', sum_v: 7 });
  });

  it('unrelated side-by-side charts: null, so the panel lists source rows', async () => {
    const data = await draw({
      hconcat: [
        { mark: 'bar', encoding: { x: { field: 'g' }, y: { aggregate: 'count' } } },
        { mark: 'bar', encoding: { x: { field: 'd' }, y: { field: 'v', aggregate: 'sum' } } },
      ],
    });
    expect(data).toBeNull();
  });
});

describe('summarize', () => {
  it('gives the count, the range and where the extremes are', () => {
    const data: ChartData = {
      from: 'plotted',
      columns: [
        { field: 'g', label: 'Region', measure: false },
        { field: 'v', label: 'Revenue', measure: true, format: '$,.0f' },
      ],
      rows: [
        { g: 'East', v: 1200 },
        { g: 'West', v: 3400 },
      ],
    };
    expect(summarize(data)).toBe(
      '2 data points by Region. Revenue ranges from $1,200 (East) to $3,400 (West).',
    );
  });

  it('turns field names into headers', () => {
    expect(['product', 'close_price', 'sum of revenue', 'Week'].map(fieldLabel)).toEqual([
      'Product',
      'Close price',
      'Sum of revenue',
      'Week',
    ]);
  });

  it('says when it is describing source rows', () => {
    expect(summarize(sourceData([{ v: 4 }], { v: 'quantitative' }))).toBe('1 source row. V is 4.');
  });

  it('replaces abbreviating formats with exact ones', () => {
    expect(['$.3~s', ',.12~g', '.1%', undefined].map(exactFormat)).toEqual([
      '$,.2~f',
      ',.6~f',
      '.1%',
      ',.6~f',
    ]);
  });
});
