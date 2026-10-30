import type { Config } from 'vega-lite';
import { tokens } from './tokens';

/** Vega-Lite config derived from design tokens. Panel specs may override via `spec.config`. */
export const vegaLiteConfig: Config = {
  background: 'transparent',
  font: tokens.font.family,
  view: { stroke: null },
  padding: 4,
  axis: {
    labelColor: tokens.color.textMuted,
    titleColor: tokens.color.textMuted,
    labelFontSize: tokens.font.sizeLabel,
    titleFontSize: tokens.font.sizeLabel,
    titleFontWeight: 500,
    gridColor: tokens.color.grid,
    domainColor: tokens.color.border,
    tickColor: tokens.color.border,
  },
  axisX: { grid: false },
  legend: {
    labelColor: tokens.color.textMuted,
    titleColor: tokens.color.textMuted,
    labelFontSize: tokens.font.sizeLabel,
    titleFontSize: tokens.font.sizeLabel,
    orient: 'bottom',
    symbolType: 'circle',
  },
  range: {
    category: [...tokens.categorical],
    ramp: [...tokens.sequential],
    heatmap: [...tokens.sequential],
  },
  line: { strokeWidth: 2 },
  bar: { cornerRadiusEnd: 2 },
};
