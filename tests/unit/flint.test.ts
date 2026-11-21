import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { View, parse as parseVega } from 'vega';
import { compile } from 'vega-lite';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { checkSpecFile, listSpecFiles, loadFixture } from '../../scripts/lib/specs';
import type { Row } from '../../src/data/transforms';
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
