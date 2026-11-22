import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { View, parse as parseVega } from 'vega';
import { compile } from 'vega-lite';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { checkSpecFile, listSpecFiles, loadFixture } from '../../scripts/lib/specs';
import type { Row } from '../../src/data/transforms';
import {
  canFitHeight,
  canTrimWidth,
  MIN_BAND_STEP,
  MIN_PLOT_HEIGHT,
} from '../../src/renderers/flintFit';
import { buildFlintSpec } from '../../src/renderers/flintSpec';
import { flintFieldRefs } from '../../src/spec/schema';
import type { FlintPanel } from '../../src/spec/types';
import { validateDashboard } from '../../src/spec/validate';
import { themes } from '../../src/theme/generated/themes';

const file = listSpecFiles().find((f) => f.includes('revenue-overview'))!;
const example = () =>
  parse(readFileSync(file, 'utf8')) as Record<
    string,
    any // eslint-disable-line @typescript-eslint/no-explicit-any
  >;
const errorsFor = (spec: unknown) => {
  const r = validateDashboard(spec);
  return r.ok ? [] : r.errors;
};
/** Run the full file check (incl. Flint's validator) on a modified copy of the example. */
const checkModified = (s: unknown) => {
  const path = join(mkdtempSync(join(tmpdir(), 'flint-')), 'revenue-overview.dashboard.yaml');
  writeFileSync(path, stringify(s));
  return checkSpecFile(path).errors.join('\n');
};

const rows = loadFixture('sales_daily.json') as Row[];
const panel: FlintPanel = {
  title: 'Revenue by region and product',
  dataset: 'sales',
  kind: 'chart-panel',
  renderer: 'flint',
  chart: {
    chartType: 'Heatmap',
    encodings: { x: 'product', y: 'region', color: { field: 'revenue', aggregate: 'sum' } },
  },
};
const semantics = { revenue: { semanticType: 'Amount', unit: 'USD' } };

describe('buildFlintSpec', () => {
  const spec = buildFlintSpec(panel, rows, semantics, { width: 600, height: 300 }) as Record<
    string,
    any // eslint-disable-line @typescript-eslint/no-explicit-any
  >;

  it('compiles to valid Vega-Lite', () => {
    expect(() => compile(spec as never)).not.toThrow();
  });

  it('drops the chart title (the panel header shows it) and private keys', () => {
    expect(spec.title).toBeUndefined();
    expect(Object.keys(spec).filter((k) => k.startsWith('_'))).toEqual([]);
  });

  it('aggregates rows and formats with the semantic unit', () => {
    expect(spec.data.values).toHaveLength(16); // 4 products × 4 regions
    expect(JSON.stringify(spec.encoding.color.legend)).toContain("'$'");
  });

  it('takes its look from design tokens', () => {
    expect(spec.background).toBe(themes.light.color.bg.surface);
    expect(JSON.stringify(spec.config)).toContain(
      JSON.stringify(themes.light.chart.label.typography.fontFamily).slice(1, -1),
    );
  });

  it('follows the active theme', () => {
    const dark = buildFlintSpec(panel, rows, semantics, { width: 600, height: 300 }, 'dark');
    expect((dark as { background?: string }).background).toBe(themes.dark.color.bg.surface);
  });

  it('leaks no Datawrapper preset ink', () => {
    const json = JSON.stringify(spec.config).toLowerCase();
    for (const ink of ['#181818', '#18a1cd', '#c71e1d', '#747474', '#888888'])
      expect(json).not.toContain(ink);
  });

  it('labels a narrow axis in the thousands in full, not in exponent form', async () => {
    const bars = Array.from({ length: 12 }, (_, i) => {
      const open = 7700 + (i % 5) * 7;
      return {
        time: `2026-10-29T10:${String(i * 5).padStart(2, '0')}:00`,
        open,
        high: open + 9,
        low: open - 9,
        close: open + 4,
      };
    });
    const candles: FlintPanel = {
      title: 'Intraday',
      dataset: 'bars',
      kind: 'chart-panel',
      renderer: 'flint',
      chart: {
        chartType: 'Candlestick Chart',
        encodings: { x: 'time', open: 'open', high: 'high', low: 'low', close: 'close' },
      },
    };
    const vl = buildFlintSpec(candles, bars, { time: 'DateTime' }, { width: 600, height: 300 });
    const svg = await new View(parseVega(compile(vl).spec), { renderer: 'none' }).toSVG();
    expect(svg).toContain('>7,700<');
    expect(svg).not.toMatch(/\de\+3/);
  });

  it("colours candles with the sign tokens, not Flint's hard-coded green and red", () => {
    const bars = [
      { time: '2026-10-29T10:00:00', open: 10, high: 12, low: 9, close: 11 },
      { time: '2026-10-29T10:05:00', open: 11, high: 12, low: 8, close: 9 },
    ];
    const candles: FlintPanel = {
      title: 'Intraday',
      dataset: 'bars',
      kind: 'chart-panel',
      renderer: 'flint',
      chart: {
        chartType: 'Candlestick Chart',
        encodings: { x: 'time', open: 'open', high: 'high', low: 'low', close: 'close' },
      },
    };
    for (const theme of ['light', 'dark'] as const) {
      const json = JSON.stringify(
        buildFlintSpec(candles, bars, { time: 'DateTime' }, { width: 400, height: 200 }, theme),
      ).toLowerCase();
      expect(json).not.toContain('#06982d');
      expect(json).not.toContain('#ae1325');
      expect(json).toContain(themes[theme].color.data.positive);
      expect(json).toContain(themes[theme].color.data.negative);
    }
  });
});

describe('buildFlintSpec trimWidth (fitting a heatmap that overflows its panel)', () => {
  const size = { width: 340, height: 300 };
  const build = (trim?: number) =>
    buildFlintSpec(panel, rows, semantics, size, 'light', {
      trimWidth: trim ?? 0,
      growHeight: 0,
    }) as { width?: unknown };

  it('leaves the chart alone without a trim', () => {
    expect(build().width).toEqual({ step: 56 });
    expect(build(0).width).toEqual({ step: 56 });
  });

  it('takes an equal share of the overflow from each of the 4 product bands', () => {
    expect(build(20).width).toEqual({ step: 51 });
  });

  it('never narrows a band below the minimum', () => {
    expect(build(1000).width).toEqual({ step: MIN_BAND_STEP });
  });
});

describe('buildFlintSpec text floor', () => {
  const sp500 = listSpecFiles()
    .map((f) => checkSpecFile(f).spec)
    .find((d) => d?.id === 'sp500-today')!;
  const intraday = sp500.panels.intraday as FlintPanel;
  const ds = sp500.datasets[intraday.dataset]!;
  const bars = loadFixture('sp500_intraday.json') as Row[];
  const sizes = (node: unknown): number[] =>
    Array.isArray(node)
      ? node.flatMap(sizes)
      : node && typeof node === 'object'
        ? Object.entries(node).flatMap(([k, v]) =>
            k === 'data' ? [] : /FontSize$/.test(k) && typeof v === 'number' ? [v] : sizes(v),
          )
        : [];

  it('keeps every axis and legend font at or above the 11px chart-label floor', () => {
    // Flint 1.0.1 shrinks the 78-candle chart's tick labels to 9px on its own.
    const spec = buildFlintSpec(intraday, bars, ds.semantics, { width: 1374, height: 280 });
    expect(Math.min(...sizes(spec))).toBeGreaterThanOrEqual(11);
  });

  it('lets Vega-Lite drop tick labels that collide at the larger size', () => {
    const spec = buildFlintSpec(intraday, bars, ds.semantics, { width: 1374, height: 280 }) as {
      encoding?: { x?: { axis?: { labelOverlap?: unknown } } };
    };
    expect(spec.encoding?.x?.axis?.labelOverlap).toBe(true);
  });
});

describe('buildFlintSpec fit on a continuous chart (the intraday candlestick)', () => {
  const sp500 = listSpecFiles()
    .map((f) => checkSpecFile(f).spec)
    .find((d) => d?.id === 'sp500-today')!;
  const intraday = sp500.panels.intraday as FlintPanel;
  const ds = sp500.datasets[intraday.dataset]!;
  const bars = loadFixture('sp500_intraday.json') as Row[];
  const size = { width: 1374, height: 280 };
  type View = { config: { view: { continuousWidth: number; continuousHeight: number } } };
  const build = (trimWidth: number, growHeight: number) =>
    buildFlintSpec(intraday, bars, ds.semantics, size, 'light', { trimWidth, growHeight }) as View;
  const base = build(0, 0).config.view;

  it('can be fitted in both directions; a banded heatmap only in width', () => {
    expect(canTrimWidth(build(0, 0))).toBe(true);
    expect(canFitHeight(build(0, 0))).toBe(true);
    const heatmap = buildFlintSpec(panel, rows, semantics, { width: 600, height: 300 });
    expect(canFitHeight(heatmap as View)).toBe(false);
  });

  it('gives the plot the height Flint reserved for the title the panel drops', () => {
    expect(build(0, 40).config.view.continuousHeight).toBe(base.continuousHeight + 40);
  });

  it('takes overflow from the plot, but never below the minimum height', () => {
    expect(build(0, -30).config.view.continuousHeight).toBe(base.continuousHeight - 30);
    expect(build(0, -10_000).config.view.continuousHeight).toBe(MIN_PLOT_HEIGHT);
  });

  it('narrows the continuous plot by the measured overflow', () => {
    expect(build(3, 0).config.view.continuousWidth).toBe(base.continuousWidth - 3);
  });
});

describe('flint spec validation', () => {
  it('collects fields from every encoding shape', () => {
    expect(flintFieldRefs({ x: 'a', y: { field: 'b' }, color: [{ field: 'c' }, 'a'] })).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('rejects encodings on undeclared fields', () => {
    const s = example();
    s.panels.heatmap.chart.encodings.y = 'segment';
    expect(errorsFor(s).join('\n')).toMatch(/field "segment" is not declared/);
  });

  it('rejects semantics for undeclared fields', () => {
    const s = example();
    s.datasets.sales.semantics.profit = 'Profit';
    expect(errorsFor(s).join('\n')).toMatch(/semantics.profit: field "profit" is not declared/);
  });

  it('rejects data or size inside a Flint chart', () => {
    const s = example();
    s.panels.heatmap.chart.baseSize = { width: 100, height: 100 };
    expect(errorsFor(s).join('\n')).toMatch(/Unrecognized key.*baseSize/);
  });

  it('rejects unknown semantic types', () => {
    const s = example();
    s.datasets.sales.semantics.region = 'Regoin';
    expect(checkModified(s)).toMatch(/datasets.sales.semantics: .*Regoin/);
  });

  it("reports Flint's own errors, e.g. an unknown chart type", () => {
    const s = example();
    s.panels.heatmap.chart.chartType = 'Sankey';
    expect(checkModified(s)).toMatch(/panels.heatmap.chart: Flint error/);
  });
});
