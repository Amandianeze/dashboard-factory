import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from 'vega-lite';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { checkSpecFile, listSpecFiles, loadFixture } from '../../scripts/lib/specs';
import type { Row } from '../../src/data/transforms';
import { buildFlintSpec } from '../../src/renderers/flintSpec';
import { flintFieldRefs } from '../../src/spec/schema';
import type { FlintPanel } from '../../src/spec/types';
import { validateDashboard } from '../../src/spec/validate';
import { tokens } from '../../src/theme/tokens';

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
    expect(spec.background).toBe(tokens.color.surface);
    expect(JSON.stringify(spec.config)).toContain(tokens.font.family.replace(/"/g, '\\"'));
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
