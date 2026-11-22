import type { Data, Datum, Layout } from 'plotly.js';
import { exactFormat, type ChartData } from '../data/chartData';
import { groupAggregate, type Row } from '../data/transforms';
import type { PlotlyPanel } from '../spec/types';
import { plotlyTheme } from '../theme/generated/engines';
import type { ThemeName } from '../theme/generated/themes';

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
  const layout: Partial<Layout> = {
    ...base,
    margin: { ...base.margin, t: groups.size > 1 ? t.marginTopWithLegend : base.margin?.t },
    showlegend: groups.size > 1,
    xaxis: { ...base.xaxis, title: { ...base.xaxis?.title, text: x } },
    yaxis: { ...base.yaxis, title: { ...base.yaxis?.title, text: y } },
    ...(panel.layout as Partial<Layout>),
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
    const label = key === 'y' && aggregate ? `${aggregate} of ${title}` : title;
    const measure = rows.some((r) => typeof r[key] === 'number');
    return {
      field: key,
      label,
      measure,
      format: measure ? exactFormat(axis?.tickformat) : undefined,
    };
  };
  const group = groupBy ? [{ field: 'group', label: groupBy, measure: false }] : [];
  return { from: 'plotted', columns: [column('x'), ...group, column('y')], rows };
}
