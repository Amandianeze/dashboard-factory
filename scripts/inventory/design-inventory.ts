/**
 * Phase 0 design inventory: every design decision that reaches the screen, by source.
 *
 *   code-tokens      src/theme/tokens.ts (the only first-party design source today)
 *   flint-preset     values inherited from the Flint preset our theme `extends`, flagged when our
 *                    theme does NOT override them (i.e. a third party decides them)
 *   engine-builtin   colours present in compiled panel output that no token produced
 *   brand-asset      public/favicon.svg
 *
 * Figma, Power BI theme.json and templates/ are not present in the repo; see gate-0.md.
 *
 *   npx tsx scripts/inventory/design-inventory.ts   # writes docs/inventory/design-inventory.csv
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { THEME_PRESETS } from 'flint-chart';
import { parse } from 'yaml';
import { buildFlintSpec } from '../../src/renderers/flintSpec';
import { flintTheme } from '../../src/theme/flintTheme';
import { tokens } from '../../src/theme/tokens';

interface Row {
  source: string;
  path: string;
  value: string;
  status: string;
  note: string;
}
const rows: Row[] = [];

type Tree = Record<string, unknown>;
function leaves(obj: unknown, prefix = ''): [string, unknown][] {
  if (Array.isArray(obj))
    return obj.every((v) => typeof v !== 'object')
      ? [[prefix, obj.join(' ')]]
      : obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  if (obj && typeof obj === 'object')
    return Object.entries(obj as Tree).flatMap(([k, v]) =>
      leaves(v, prefix ? `${prefix}.${k}` : k),
    );
  return [[prefix, obj]];
}
const get = (obj: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Tree)[k] : undefined), obj);

/* code tokens */
for (const [path, value] of leaves(tokens))
  rows.push({
    source: 'code-tokens',
    path: `tokens.${path}`,
    value: String(value),
    status: 'first-party',
    note: '',
  });

/* flint preset vs our overrides */
const presetId = flintTheme.extends as keyof typeof THEME_PRESETS;
const preset = (THEME_PRESETS[presetId] as unknown as { spec: Tree }).spec;
const ours = flintTheme as unknown as Tree;
for (const [path, value] of leaves(preset)) {
  if (/^(id|label)$/.test(path) || path.startsWith('compileDefaults')) continue;
  const overridden = get(ours, path) !== undefined;
  // A parent array/object override (e.g. series.categorical) also counts.
  const parentOverridden = path
    .split('.')
    .slice(0, -1)
    .some((_, i, a) => {
      const p = a.slice(0, i + 1).join('.');
      const v = get(ours, p);
      return v !== undefined && (Array.isArray(v) || typeof v !== 'object');
    });
  rows.push({
    source: `flint-preset:${presetId}`,
    path,
    value: String(value),
    status: overridden || parentOverridden ? 'overridden-by-tokens' : 'inherited-uncontrolled',
    note: overridden ? `ours: ${String(get(ours, path))}` : '',
  });
}

/* colours in compiled Flint output that no token produced */
const tokenColours = new Set(
  leaves(tokens)
    .flatMap(([, v]) => String(v).split(' '))
    .filter((v) => v.startsWith('#'))
    .map((v) => v.toLowerCase()),
);
const panels: [string, string][] = [
  ['revenue-overview', 'heatmap'],
  ['sp500-today', 'intraday'],
];
for (const [dash, id] of panels) {
  const d = parse(readFileSync(`dashboards/${dash}.dashboard.yaml`, 'utf8'));
  const p = d.panels[id];
  const ds = d.datasets[p.dataset];
  const data = JSON.parse(readFileSync(`public/data/${ds.path}`, 'utf8'));
  const spec = JSON.stringify(buildFlintSpec(p, data, ds.semantics, { width: 800, height: 300 }));
  for (const c of new Set(spec.match(/#[0-9a-fA-F]{6}\b/g) ?? []))
    if (!tokenColours.has(c.toLowerCase()))
      rows.push({
        source: 'engine-builtin:flint',
        path: `${dash}/${id}`,
        value: c,
        status: 'untokenized',
        note: p.chart.chartType,
      });
}

/* plotly defaults we rely on (observed in screenshots; not overridden in plotlyFigure.ts) */
for (const [path, value, note] of <[string, string, string][]>[
  ['yaxis.tickformat', '(plotly default)', 'renders 6000 not 6,000; no d3-format from tokens'],
  ['axis title text', 'raw field name', 'renders "revenue" not "Revenue"'],
  ['xaxis.showgrid', 'true (plotly default)', 'VL config sets axisX.grid=false; engines disagree'],
  ['marker symbol', 'filled circle', 'VL legend uses hollow circles'],
])
  rows.push({ source: 'engine-builtin:plotly', path, value, status: 'untokenized', note });

/* favicon */
const svg = readFileSync('public/favicon.svg', 'utf8');
for (const c of new Set(svg.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []))
  rows.push({
    source: 'brand-asset',
    path: 'public/favicon.svg',
    value: c,
    status: tokenColours.has(c.toLowerCase()) ? 'matches-token' : 'raw',
    note: '',
  });

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const header = ['source', 'path', 'value', 'status', 'note'] as const;
writeFileSync(
  'docs/inventory/design-inventory.csv',
  [header.join(','), ...rows.map((r) => header.map((k) => esc(r[k])).join(','))].join('\n') + '\n',
);
const counts = rows.reduce<Record<string, number>>(
  (a, r) => ((a[`${r.source} / ${r.status}`] = (a[`${r.source} / ${r.status}`] ?? 0) + 1), a),
  {},
);
console.table(counts);
