/**
 * Chart-engine adapters: resolved tokens → Vega-Lite config, Flint theme, Plotly layout.
 * Build-time only. build.ts writes the results to src/theme/generated/engines.ts, which is what
 * the renderers import. Every visual value comes from a token; what's left here is engine policy
 * (which preset to extend, where legends go), each line commented.
 *
 * References: https://vega.github.io/vega-lite/docs/config.html ·
 * flint-chart 1.0.1 ThemeSpec (node_modules/flint-chart/dist/types-*.d.ts) ·
 * https://plotly.com/javascript/reference/layout/
 */
import type { ThemeSpec } from 'flint-chart';
import type { Layout } from 'plotly.js';
import type { Config } from 'vega-lite';
import type { Formats, ResolvedSet, Typography } from './lib';

export type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
const isWeight = (n: number): n is Weight => n >= 100 && n <= 900 && n % 100 === 0;
const asWeight = (n: number, p: string): Weight => {
  if (!isWeight(n)) throw new Error(`engines: ${p} weight ${n} is not a multiple of 100`);
  return n;
};

export interface Lookup {
  color(path: string): string;
  weight(path: string): Weight;
  num(path: string): number;
  text(path: string): string;
  type(path: string): Typography;
  list(prefix: string): string[];
}

export function lookup(set: ResolvedSet): Lookup {
  const get = (p: string) => {
    const t = set.tokens.get(p);
    if (!t) throw new Error(`engines: unknown token ${p}`);
    return t.resolved;
  };
  const typed = <T>(p: string, check: (v: unknown) => boolean, what: string): T => {
    const v = get(p);
    if (!check(v)) throw new Error(`engines: ${p} is not a ${what}`);
    return v as T;
  };
  return {
    color: (p) => typed<string>(p, (v) => typeof v === 'string', 'colour'),
    num: (p) => typed<number>(p, (v) => typeof v === 'number', 'number'),
    weight: (p) =>
      asWeight(
        typed<number>(p, (v) => typeof v === 'number', 'number'),
        p,
      ),
    text: (p) => typed<string>(p, (v) => typeof v === 'string', 'string'),
    type: (p) =>
      typed<Typography>(p, (v) => !!v && typeof v === 'object' && 'fontSize' in v, 'typography'),
    list: (prefix) =>
      [...set.tokens.keys()]
        .filter((k) => k.startsWith(prefix + '.') && !k.slice(prefix.length + 1).includes('.'))
        .sort((a, b) => order(a.split('.').at(-1)!) - order(b.split('.').at(-1)!))
        .map((k) => typed<string>(k, (v) => typeof v === 'string', 'colour')),
  };
}
/** Sort keys numerically, so 1…10 and -4…+4 come out in order. */
const order = (k: string) => Number(k.replace(/^\+/, ''));

/* ---------------------------------------------------------------- Vega-Lite */

export function vegaLiteConfig(t: Lookup, f: Formats): Config {
  const label = t.type('chart.label.typography');
  return {
    background: 'transparent', // the panel paints the surface
    font: label.fontFamily,
    view: { stroke: null },
    padding: t.num('chart.padding'),
    numberFormat: f.number.axis,
    axis: {
      labelColor: t.color('chart.label.text'),
      titleColor: t.color('chart.label.text'),
      labelFont: label.fontFamily,
      titleFont: label.fontFamily,
      labelFontSize: label.fontSize,
      titleFontSize: label.fontSize,
      titleFontWeight: t.weight('chart.axis.title-weight'),
      gridColor: t.color('chart.grid'),
      domainColor: t.color('chart.axis.domain'),
      tickColor: t.color('chart.axis.domain'),
    },
    axisX: { grid: false }, // policy: measure gridlines only
    legend: {
      labelColor: t.color('chart.label.text'),
      titleColor: t.color('chart.label.text'),
      labelFontSize: label.fontSize,
      titleFontSize: label.fontSize,
      // Policy (DESIGN.md › Data Visualization): legends sit above the plot, left-aligned.
      orient: 'top',
      direction: 'horizontal',
      symbolType: 'circle',
      gradientLength: t.num('chart.legend.gradient-length'),
    },
    title: { color: t.color('chart.label.text-strong'), font: label.fontFamily },
    range: {
      category: t.list('color.data.categorical'),
      ramp: t.list('color.data.sequential.blue'),
      heatmap: t.list('color.data.sequential.blue'),
      diverging: t.list('color.data.diverging.blue-orange'),
    },
    line: { strokeWidth: t.num('chart.mark.line-width') },
    bar: { cornerRadiusEnd: t.num('chart.mark.bar-radius') },
    // Vega point size is an area in px².
    point: { size: Math.round(Math.PI * (t.num('chart.mark.point-diameter') / 2) ** 2) },
    rule: { color: t.color('chart.baseline') },
  };
}

/* -------------------------------------------------------------------- Flint */

export function flintTheme(t: Lookup, theme: string): ThemeSpec {
  const label = t.type('chart.label.typography');
  const role = (p: string, color: string) => {
    const ty = t.type(p);
    return { family: ty.fontFamily, size: ty.fontSize, weight: asWeight(ty.fontWeight, p), color };
  };
  const muted = t.color('chart.label.text');
  const strong = t.color('chart.label.text-strong');
  const surface = t.color('color.bg.surface');
  return {
    // Extend for behaviour (axis omission, label density, data-label rules); every ink and type
    // value Datawrapper sets is overridden below, so no third-party colour reaches the screen.
    extends: 'datawrapper',
    id: `factory-${theme}`,
    ink: {
      surface: { source: 'house', canvas: surface, plot: surface, panel: surface },
      text: { primary: strong, secondary: muted, muted, inverse: t.color('color.text.on-accent') },
      structure: {
        axis: t.color('chart.axis.domain'),
        grid: t.color('chart.grid'),
        rule: t.color('chart.axis.domain'),
        zero: t.color('chart.baseline'),
        connector: t.color('chart.baseline'),
        frame: t.color('chart.axis.domain'),
      },
      series: {
        single: t.color('color.data.categorical.1'),
        categorical: t.list('color.data.categorical'),
        categoricalExtended: t.list('color.data.categorical'),
        overflow: t.color('color.data.neutral'),
        roles: { other: t.color('color.data.neutral'), missing: t.color('color.data.neutral') },
        sequential: {
          stops: t.list('color.data.sequential.blue'),
          space: 'lab',
          consumption: 'interpolate', // same continuous ramp Vega-Lite uses
        },
        diverging: {
          stops: t.list('color.data.diverging.blue-orange'),
          neutral: t.color('color.data.diverging.blue-orange.0'),
          space: 'lab',
          consumption: 'interpolate',
        },
        status: {
          positive: t.color('color.data.positive'),
          negative: t.color('color.data.negative'),
          neutral: t.color('color.data.neutral'),
        },
      },
      accent: t.color('color.data.highlight'),
    },
    type: {
      minSize: label.fontSize,
      headline: role('typography.heading', strong),
      deck: role('typography.body', muted),
      axisLabel: role('chart.label.typography', muted),
      axisTitle: role('chart.label.typography', muted),
      keyLabel: role('chart.label.typography', muted),
      keyTitle: role('chart.label.typography', muted),
      valueLabel: role('chart.label.typography', strong),
      annotation: role('chart.label.typography', muted),
      footnote: role('chart.label.typography', muted),
      display: role('typography.display', strong),
    },
    structure: { baseline: { color: t.color('chart.baseline') } },
    marks: { point: { size: Math.round(Math.PI * (t.num('chart.mark.point-diameter') / 2) ** 2) } },
    // Policy (DESIGN.md › Data Visualization): legends above the plot, left-aligned, as in VL/Plotly.
    legend: {
      placement: ['top'],
      direction: 'horizontal',
      gradientLength: t.num('chart.legend.gradient-length'),
    },
    variants: [
      {
        // flint-chart 1.0.1 sizes heatmap cells to the full height without reserving room for a
        // key above them, so a top key pushes the chart out of its panel. Colour keys go beside.
        when: { markChannel: 'color' },
        then: { legend: { placement: ['right', 'bottom'], direction: 'vertical' } },
        because: 'a continuous colour key beside the plot keeps banded charts inside their panel',
      },
    ],
  };
}

/* ------------------------------------------------------------------- Plotly */

export interface PlotlyTheme {
  layout: Partial<Layout>;
  colorway: string[];
  marker: { size: number; opacity: number };
  /** Top margin when a legend sits above the plot. */
  marginTopWithLegend: number;
}

export function plotlyTheme(t: Lookup, f: Formats): PlotlyTheme {
  const label = t.type('chart.label.typography');
  const font = {
    family: label.fontFamily,
    size: label.fontSize,
    color: t.color('chart.label.text'),
  };
  const axis = {
    gridcolor: t.color('chart.grid'),
    linecolor: t.color('chart.axis.domain'),
    zeroline: false,
    tickformat: f.number.axis,
    tickfont: font,
    title: { font },
  };
  return {
    colorway: t.list('color.data.categorical'),
    marker: {
      size: t.num('chart.mark.point-diameter'),
      opacity: t.num('chart.mark.point-opacity'),
    },
    marginTopWithLegend: t.num('chart.inset.top-legend'),
    layout: {
      paper_bgcolor: 'rgba(0,0,0,0)', // the panel paints the surface
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: label.fontFamily, color: t.color('chart.label.text-strong') },
      margin: {
        l: t.num('chart.inset.left'),
        r: t.num('chart.inset.right'),
        t: t.num('chart.inset.top'),
        b: t.num('chart.inset.bottom'),
      },
      hoverlabel: { font: { family: label.fontFamily } },
      legend: {
        // Above the plot, anchored to the container so it never collides with the x-axis title.
        orientation: 'h',
        yref: 'container',
        y: 1,
        yanchor: 'top',
        x: 0,
        xanchor: 'left',
        font,
      },
      xaxis: { ...axis, showgrid: false }, // policy: measure gridlines only, as in Vega-Lite
      yaxis: axis,
    },
  };
}
