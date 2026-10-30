import type { Data, Datum, Layout } from 'plotly.js';
import { groupAggregate, type Row } from '../data/transforms';
import type { PlotlyPanel } from '../spec/types';
import { tokens } from '../theme/tokens';

/** Pure: turn a Plotly panel spec + rows into a themed figure. Unit-testable without a DOM. */
export function buildPlotlyFigure(
  panel: PlotlyPanel,
  rows: Row[],
): { data: Data[]; layout: Partial<Layout> } {
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
      const color = tokens.categorical[i % tokens.categorical.length];
      return {
        type,
        name: name || y,
        x: points.map((p) => p[x]) as Datum[],
        y: points.map((p) => p[y]) as Datum[],
        ...(type === 'scatter'
          ? { mode: mode ?? 'markers', marker: { color, size: 5, opacity: 0.7 }, line: { color } }
          : { marker: { color } }),
      } as Data;
    });

  const axis = {
    gridcolor: tokens.color.grid,
    linecolor: tokens.color.border,
    zeroline: false,
    tickfont: { size: tokens.font.sizeLabel, color: tokens.color.textMuted },
    title: { font: { size: tokens.font.sizeLabel, color: tokens.color.textMuted } },
  };
  const layout: Partial<Layout> = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: tokens.font.family, color: tokens.color.text },
    margin: { l: 56, r: 12, t: groups.size > 1 ? 36 : 8, b: 44 },
    showlegend: groups.size > 1,
    // Legend above the plot area so it never collides with the x-axis title.
    legend: {
      orientation: 'h',
      // Anchor to the container (not the plot area) so it sits in the top margin.
      yref: 'container',
      y: 1,
      yanchor: 'top',
      x: 0,
      xanchor: 'left',
      font: { size: tokens.font.sizeLabel, color: tokens.color.textMuted },
    },
    xaxis: { ...axis, title: { ...axis.title, text: x } },
    yaxis: { ...axis, title: { ...axis.title, text: y } },
    ...(panel.layout as Partial<Layout>),
  };
  return { data, layout };
}
