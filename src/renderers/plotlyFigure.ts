import type { Annotations, Data, Datum, Layout } from 'plotly.js';
import { exactFormat, fieldLabel, type ChartData } from '../data/chartData';
import { groupAggregate, type Row } from '../data/transforms';
import type { PlotlyPanel } from '../spec/types';
import { plotlyTheme } from '../theme/generated/engines';
import type { ThemeName } from '../theme/generated/themes';

/** DESIGN.md: prefer direct labels to a legend for this many series or fewer. */
export const MAX_DIRECT_LABELS = 4;

/**
 * A label at the far end of each series of a grouped scatter: its rightmost point (highest when
 * tied), in the label type with a dot in the series colour. Plotly widens the x range to fit the
 * labels. Computed from the plotted points, so they follow filters.
 */
function directLabels(data: Data[], colors: string[], font: Partial<Annotations['font']>) {
  return data.map((trace, i): Partial<Annotations> => {
    const { name, x, y } = trace as { name: string; x: number[]; y: number[] };
    let end = 0;
    x.forEach((v, j) => {
      if (v > x[end]! || (v === x[end] && y[j]! > y[end]!)) end = j;
    });
    return {
      x: x[end],
      y: y[end],
      xref: 'x',
      yref: 'y',
      xanchor: 'left',
      xshift: 6,
      showarrow: false,
      text: `<span style="color:${colors[i]}">●</span> ${name}`,
      font,
    };
  });
}

/** Pure: turn a Plotly panel spec + rows into a themed figure. Unit-testable without a DOM. */
export function buildPlotlyFigure(
  panel: PlotlyPanel,
  rows: Row[],
  theme: ThemeName = 'light',
): { data: Data[]; layout: Partial<Layout> } {
  const t = plotlyTheme[theme];
  const { type, x, y, groupBy, aggregate, mode } = panel.trace;
  const groups = new Map<string, Row[]>();
  if (groupBy) {
    for (const r of rows) {
      const k = String(r[groupBy]);
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
  } else groups.set('', rows);

  const data: Data[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, g], i) => {
      const points = aggregate ? groupAggregate(g, [x], y, aggregate) : g;
      const color = t.colorway[i % t.colorway.length];
      return {
        type,
        name: name || y,
        x: points.map((p) => p[x]) as Datum[],
        y: points.map((p) => p[y]) as Datum[],
        ...(type === 'scatter'
          ? { mode: mode ?? 'markers', marker: { color, ...t.marker }, line: { color } }
          : { marker: { color } }),
      } as Data;
    });

  const { layout: base } = t;
  const labelled =
    type === 'scatter' && groups.size > 1 && groups.size <= MAX_DIRECT_LABELS && !!groupBy;
  const labelFont = base.legend?.font ?? {};
  const names = data.map((d) => (d as { name: string }).name); // sorted, as the colours are
  const over = (panel.layout ?? {}) as Partial<Layout>;
  // A spec's axis overrides (a title, a tickformat) merge into the themed axis instead of
  // replacing it, so they keep the token fonts, colours and gridlines. Titles default to the field.
  const axis = (key: 'xaxis' | 'yaxis', field: string) => ({
    ...base[key],
    ...over[key],
    title: { ...base[key]?.title, text: field, ...over[key]?.title },
  });
  const layout: Partial<Layout> = {
    ...base,
    margin: {
      ...base.margin,
      t: groups.size > 1 && !labelled ? t.marginTopWithLegend : base.margin?.t,
    },
    showlegend: groups.size > 1 && !labelled,
    ...(labelled && {
      annotations: directLabels(
        data,
        names.map((_, i) => t.colorway[i % t.colorway.length]!),
        labelFont,
      ),
    }),
    ...over,
    xaxis: axis('xaxis', x),
    yaxis: axis('yaxis', y),
  };
  return { data, layout };
}

/** Pure: the points a figure plots, for the chart's table view and summary. */
export function plotlyChartData(
  panel: PlotlyPanel,
  figure: ReturnType<typeof buildPlotlyFigure>,
): ChartData {
  const { groupBy, aggregate } = panel.trace;
  const rows = figure.data.flatMap((trace) => {
    const { name, x, y } = trace as { name: string; x: Datum[]; y: Datum[] };
    return x.map((value, i) => ({ x: value, ...(groupBy ? { group: name } : {}), y: y[i] }));
  });
  const column = (key: 'x' | 'y') => {
    const axis = figure.layout[`${key}axis`];
    const title = axis?.title?.text ?? panel.trace[key];
    const label = fieldLabel(key === 'y' && aggregate ? `${aggregate} of ${title}` : title);
    const measure = rows.some((r) => typeof r[key] === 'number');
    return {
      field: key,
      label,
      measure,
      format: measure ? exactFormat(axis?.tickformat) : undefined,
    };
  };
  const group = groupBy ? [{ field: 'group', label: fieldLabel(groupBy), measure: false }] : [];
  return { from: 'plotted', columns: [column('x'), ...group, column('y')], rows };
}
