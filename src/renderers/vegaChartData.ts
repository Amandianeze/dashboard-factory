/**
 * What a Vega-Lite or Flint view drew, for the chart's table view and summary. Loaded with
 * vega-embed, so dashboards without Vega charts don't pay for it.
 */
import { format, timeFormat, utcFormat } from 'd3';
import { DEFAULT_FORMAT, exactFormat, type ChartColumn, type ChartData } from '../data/chartData';
import type { Row } from '../data/transforms';

/** Without a spec format, a column shares one precision (7,699.80 under 7,699.25), up to 4 places. */
function columnFormat(values: unknown[]): string {
  let places = 0;
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    while (places <= 4 && Math.abs(Number(v.toFixed(places)) - v) > 1e-7) places++;
    if (places > 4) return DEFAULT_FORMAT;
  }
  return `,.${places}f`;
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

const CHANNELS = [
  'row',
  'column',
  'facet',
  'x',
  'x2',
  'xOffset',
  'y',
  'y2',
  'yOffset',
  'theta',
  'theta2',
  'radius',
  'color',
  'fill',
  'stroke',
  'size',
  'shape',
  'opacity',
  'strokeDash',
  'detail',
  'text',
  'tooltip',
];

interface Encoded {
  channel: string;
  def: Json;
}

/** Field encodings of every unit in a spec, with layer children inheriting their parent's. */
function encodedFields(node: unknown, inherited: Json = {}): Encoded[] {
  if (!isObject(node)) return [];
  const encoding: Json = { ...inherited };
  if (isObject(node.encoding))
    for (const [channel, def] of Object.entries(node.encoding)) {
      const parent = encoding[channel];
      encoding[channel] = isObject(parent) && isObject(def) ? { ...parent, ...def } : def;
    }
  const children = [node.layer, node.hconcat, node.vconcat, node.concat, node.spec].flatMap(
    (child) => (Array.isArray(child) ? child : child ? [child] : []),
  );
  const facet = isObject(node.facet)
    ? ('field' in node.facet ? [node.facet] : [node.facet.row, node.facet.column])
        .filter(isObject)
        .map((def) => ({ channel: 'facet', def }))
    : [];
  if (children.length) return [...facet, ...children.flatMap((c) => encodedFields(c, encoding))];
  return CHANNELS.flatMap((channel) => {
    const value = encoding[channel];
    return (Array.isArray(value) ? value : [value])
      .filter(isObject)
      .filter((def) => def.field !== undefined || def.aggregate === 'count')
      .map((def) => ({ channel, def }));
  });
}

/** Root datasets the marks draw from, following facets (series of a line, small multiples). */
function drawnDatasets(marks: unknown): string[] {
  if (!Array.isArray(marks)) return [];
  return marks.filter(isObject).flatMap((mark) => {
    const from = isObject(mark.from) ? mark.from : {};
    const name = str(from.data) ?? (isObject(from.facet) ? str(from.facet.data) : undefined);
    return [...(name ? [name] : []), ...drawnDatasets(mark.marks)];
  });
}

const unitOf = (timeUnit: unknown) =>
  str(timeUnit) ?? (isObject(timeUnit) ? str(timeUnit.unit) : undefined);

/** The name Vega-Lite gives an encoded field in the compiled data, or undefined if it has none. */
function outputKey(def: Json, sample: Row): string | undefined {
  if (def.aggregate === 'count' && '__count' in sample) return '__count';
  const field = str(def.field)?.replace(/\\(.)/g, '$1');
  if (!field) return undefined;
  if (def.bin && def.bin !== 'binned') {
    return Object.keys(sample).find(
      (k) => k.startsWith('bin_') && k.endsWith(`_${field}`) && `${k}_end` in sample,
    );
  }
  const op = str(def.aggregate);
  const unit = unitOf(def.timeUnit);
  const key = op ? `${op}_${field}` : unit ? `${unit}_${field}` : field;
  return key in sample ? key : undefined;
}

/** Time units print like Vega-Lite's axis labels (utcyearweek → 2026 W14). */
function timeUnitFormat(unit: string): (d: Date) => string {
  const utc = unit.startsWith('utc');
  let rest = unit.replace(/^utc/, '').replace(/^binned/, '');
  const take = (part: string) => {
    if (!rest.includes(part)) return false;
    rest = rest.replace(part, '');
    return true;
  };
  const year = take('year');
  const dayOfYear = take('dayofyear');
  const quarter = take('quarter');
  const month = take('month');
  const week = take('week');
  const date = take('date');
  const day = take('day');
  const hours = take('hours');
  const minutes = take('minutes');
  const seconds = take('seconds');

  const calendar =
    year && month
      ? `%Y-%m${date ? '-%d' : ''}`
      : [
          year && '%Y',
          quarter && 'Q%q',
          month && '%b',
          week && 'W%U',
          date && '%d',
          dayOfYear && '%j',
        ]
          .filter(Boolean)
          .join(' ');
  const clock =
    hours || minutes || seconds
      ? `${hours ? '%H' : ''}:${minutes ? '%M' : '00'}${seconds ? ':%S' : ''}`
      : '';
  const pattern = [calendar, day && '%a', clock].filter(Boolean).join(' ') || '%Y-%m-%d';
  return (utc ? utcFormat : timeFormat)(pattern);
}

const DAY_MS = 86_400_000;

/** Temporal values as sortable text; a column of UTC midnights is dates (how ISO dates parse). */
function temporalText(values: unknown[]): (d: Date) => string {
  const dateOnly = values.every((v) => v === null || v === undefined || Number(v) % DAY_MS === 0);
  return dateOnly ? utcFormat('%Y-%m-%d') : timeFormat('%Y-%m-%d %H:%M');
}

function titleOf(def: Json): string | undefined {
  const { axis, legend } = def;
  return (
    str(def.title) ??
    (isObject(axis) ? str(axis.title) : undefined) ??
    (isObject(legend) ? str(legend.title) : undefined)
  );
}

function defaultLabel(def: Json): string {
  if (def.aggregate === 'count') return 'Count';
  const field = String(def.field);
  return typeof def.aggregate === 'string' ? `${def.aggregate} of ${field}` : field;
}

/** A tooltip's format is the exact one; axis and legend formats are often abbreviated. */
function formatOf(uses: Encoded[]): string {
  const tooltip = uses.find((u) => u.channel === 'tooltip' && str(u.def.format));
  if (tooltip) return exactFormat(str(tooltip.def.format));
  for (const { def } of uses)
    for (const holder of [def, def.axis, def.legend]) {
      if (!isObject(holder)) continue;
      const spec = str(holder.format);
      if (spec) return exactFormat(spec);
      // Flint writes a currency unit into labelExpr, not into a format.
      if (str(holder.labelExpr)?.startsWith("'$' +")) return '$,.2~f';
    }
  return DEFAULT_FORMAT;
}

/**
 * What a Vega-Lite view drew. Reads the compiled datasets the marks use, so aggregates, bins, time
 * units and filters match the chart. Null when no one drawn dataset has every encoded field.
 */
export function vegaChartData(
  spec: unknown,
  compiled: unknown,
  data: (name: string) => Row[],
): ChartData | null {
  if (!isObject(compiled) || !Array.isArray(compiled.data)) return null;
  const encoded = encodedFields(spec);
  if (!encoded.length || encoded.some((e) => isObject(e.def.field))) return null; // repeat

  const roots = new Set(compiled.data.filter(isObject).map((d) => str(d.name)));
  let best: { keys: string[]; rows: Row[] } | undefined;
  for (const name of new Set(drawnDatasets(compiled.marks))) {
    if (!roots.has(name)) continue;
    const rows = data(name);
    const sample = rows[0];
    if (!sample) continue;
    const keys = encoded.map((e) => outputKey(e.def, sample));
    // Layers split and filter the rows, so take the largest set that has every field.
    if (keys.every((k) => k !== undefined) && (!best || rows.length > best.rows.length))
      best = { keys: keys as string[], rows };
  }
  if (!best) return null;

  const uses = new Map<string, Encoded[]>();
  best.keys.forEach((key, i) => uses.set(key, [...(uses.get(key) ?? []), encoded[i]!]));

  const columns: ChartColumn[] = [];
  const readers: ((row: Row) => unknown)[] = [];
  for (const [key, list] of uses) {
    const defs = list.map((u) => u.def);
    const label = defs.map(titleOf).find(Boolean) ?? defaultLabel(defs[0]!);
    const type = defs.map((d) => str(d.type)).find(Boolean);
    const unit = defs.map((d) => unitOf(d.timeUnit)).find(Boolean);
    const aggregated = defs.some((d) => d.aggregate);
    let measure = false;
    let read = (row: Row): unknown => row[key];

    if (key.startsWith('bin_')) {
      const fmt = format(DEFAULT_FORMAT);
      read = (row) =>
        row[key] === null || row[key] === undefined
          ? null
          : `${fmt(Number(row[key]))} to ${fmt(Number(row[`${key}_end`]))}`;
    } else if (!aggregated && (unit || type === 'temporal')) {
      const text = unit ? timeUnitFormat(unit) : temporalText(best.rows.map((r) => r[key]));
      read = (row) => {
        const v = row[key];
        if (v === null || v === undefined) return null;
        const date = new Date(v as number | string | Date);
        return Number.isNaN(date.getTime()) ? String(v) : text(date);
      };
    } else if (type !== 'nominal' && type !== 'ordinal') {
      measure =
        aggregated || type === 'quantitative' || best.rows.some((r) => typeof r[key] === 'number');
    }
    columns.push({ field: key, label, measure, format: measure ? formatOf(list) : undefined });
    readers.push(read);
  }

  const rows = best.rows.map((row) =>
    Object.fromEntries(columns.map((c, i) => [c.field, readers[i]!(row)])),
  );
  for (const c of columns)
    if (c.format === DEFAULT_FORMAT) c.format = columnFormat(rows.map((r) => r[c.field]));
  // Dimensions first, as a table reads.
  columns.sort((a, b) => Number(a.measure) - Number(b.measure));
  return { columns, rows, from: 'plotted' };
}
