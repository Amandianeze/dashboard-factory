/**
 * A chart's text alternative (docs/lld/chart-panel.md): the rows the engine drew, as a table, and
 * a sentence generated from them. Pure: engines pass in what they drew.
 */
import { format } from 'd3';
import type { Row } from './transforms';

export interface ChartColumn {
  field: string;
  label: string;
  /** A measure gets a range in the summary; a dimension says where the extremes are. */
  measure: boolean;
  /** d3-format; measures only. */
  format?: string;
}

export interface ChartData {
  columns: ChartColumn[];
  rows: Row[];
  /** `plotted`: what the chart drew. `source`: the panel's rows, when that can't be read. */
  from: 'plotted' | 'source';
}

/** Engines call this after each draw; null means the drawn rows couldn't be read. */
export type OnChartData = (data: ChartData | null) => void;

export const DEFAULT_FORMAT = ',.6~f';

/** A field name as a column header and in the read-out summary: `close_price` → "Close price". */
export function fieldLabel(field: string): string {
  const words = field.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Axis formats abbreviate ($1.5M); a table is for looking up the exact value. */
export function exactFormat(spec: string | undefined): string {
  if (!spec) return DEFAULT_FORMAT;
  if (!/[sge]$/.test(spec)) return spec;
  return spec.includes('$') ? '$,.2~f' : DEFAULT_FORMAT;
}

/** The panel's own rows, for charts whose drawn rows can't be read (concat, repeat). */
export function sourceData(rows: Row[], fields: Record<string, string>): ChartData {
  const columns = Object.entries(fields).map(([field, type]) => {
    const measure = type === 'quantitative';
    return { field, label: fieldLabel(field), measure, format: measure ? DEFAULT_FORMAT : undefined };
  });
  return { columns, rows, from: 'source' };
}

/** One or more plain sentences: how much is plotted, and each measure's range and where it is. */
export function summarize({ columns, rows, from }: ChartData): string {
  if (!rows.length) return 'The chart has no values to show.';
  const dimensions = columns.filter((c) => !c.measure);
  const measures = columns.filter((c) => c.measure).slice(0, 4);
  const noun = from === 'plotted' ? 'data point' : 'source row';
  const count = `${format(',')(rows.length)} ${noun}${rows.length === 1 ? '' : 's'}`;
  const by = dimensions.map((c) => c.label).join(', ');
  const sentences = [`${count}${by ? ` by ${by}` : ''}.`];

  for (const { field, label, format: spec } of measures) {
    let low: Row | undefined;
    let high: Row | undefined;
    for (const row of rows) {
      const v = row[field];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      if (!low || v < (low[field] as number)) low = row;
      if (!high || v > (high[field] as number)) high = row;
    }
    if (!low || !high) continue;
    const fmt = format(spec ?? DEFAULT_FORMAT);
    const at = (row: Row) => {
      const where = dimensions.map((d) => row[d.field] ?? 'no value').join(', ');
      return `${fmt(row[field] as number)}${where ? ` (${where})` : ''}`;
    };
    sentences.push(
      low[field] === high[field]
        ? `${label} is ${fmt(low[field] as number)}.`
        : `${label} ranges from ${at(low)} to ${at(high)}.`,
    );
  }
  return sentences.join(' ');
}
