import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { checkSpecFile, listSpecFiles } from '../../scripts/lib/specs';
import { validateDashboard } from '../../src/spec/validate';

const files = listSpecFiles();
const example = () =>
  parse(
    readFileSync(
      files.find((f) => f.includes('revenue-overview'))!,
      'utf8',
    ),
  ) as Record<
    string,
    any // eslint-disable-line @typescript-eslint/no-explicit-any
  >;
const errorsFor = (spec: unknown) => {
  const r = validateDashboard(spec);
  return r.ok ? [] : r.errors;
};

describe('every dashboard spec in /dashboards', () => {
  it.each(files.map((f) => [f.split('/').pop()!, f]))('%s is valid and compiles', (_, file) => {
    expect(checkSpecFile(file).errors).toEqual([]);
  });
});

describe('cross-reference validation', () => {
  it('rejects a layout cell pointing at an unknown panel', () => {
    const s = example();
    s.layout.rows[0].cells.push({ panel: 'ghost', span: 1 });
    expect(errorsFor(s).join('\n')).toMatch(/unknown panel "ghost"/);
  });

  it('rejects a panel that is never placed', () => {
    const s = example();
    s.panels.orphan = { ...s.panels.orders_total, title: 'Orphan' };
    expect(errorsFor(s).join('\n')).toMatch(/"orphan" is not placed/);
  });

  it('rejects Vega-Lite encodings on undeclared fields', () => {
    const s = example();
    s.panels.trend.spec.encoding.color.field = 'segment';
    expect(errorsFor(s).join('\n')).toMatch(/field "segment" is not declared/);
  });

  it('rejects inline data in Vega-Lite panels', () => {
    const s = example();
    s.panels.trend.spec.data = { values: [] };
    expect(errorsFor(s).join('\n')).toMatch(/omit `data`/);
  });

  it('rejects unknown D3 components and bad props', () => {
    const s = example();
    s.panels.by_product.component = 'Sankey';
    expect(errorsFor(s).join('\n')).toMatch(/unknown D3 chart "Sankey"/);
    const t = example();
    t.panels.by_product.props.value = 'profit';
    expect(errorsFor(t).join('\n')).toMatch(/props.value: field "profit"/);
  });

  it('rejects rows wider than 12 columns', () => {
    const s = example();
    s.layout.rows[0].cells[0].span = 8;
    expect(errorsFor(s).join('\n')).toMatch(/row spans must total 12 or less/);
  });

  it('rejects invalid d3-format specifiers (e.g. an unquoted "$, .0f" in flow YAML)', () => {
    const s = example();
    s.panels.revenue_total.format = '$, .0f';
    expect(errorsFor(s).join('\n')).toMatch(/invalid d3-format specifier/);
  });

  it('rejects sum over a non-quantitative field', () => {
    const s = example();
    s.panels.revenue_total.field = 'region';
    expect(errorsFor(s).join('\n')).toMatch(/needs a quantitative field/);
  });
});
