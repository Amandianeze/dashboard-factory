import type { ThemeSpec } from 'flint-chart';
import { tokens } from './tokens';

const label = { family: tokens.font.family, size: tokens.font.sizeLabel };

/** Flint theme derived from design tokens. Flint panels never name a preset theme directly. */
export const flintTheme: ThemeSpec = {
  extends: 'datawrapper',
  id: 'dashboard-factory',
  ink: {
    surface: { canvas: tokens.color.surface, plot: tokens.color.surface },
    text: {
      primary: tokens.color.text,
      secondary: tokens.color.textMuted,
      muted: tokens.color.textMuted,
    },
    structure: { axis: tokens.color.border, grid: tokens.color.grid },
    series: {
      single: tokens.color.accent,
      categorical: [...tokens.categorical],
      sequential: { stops: [...tokens.sequential] },
    },
    accent: tokens.color.accent,
  },
  type: {
    axisLabel: { ...label, color: tokens.color.textMuted },
    axisTitle: { ...label, color: tokens.color.textMuted },
    keyLabel: { ...label, color: tokens.color.textMuted },
    keyTitle: { ...label, color: tokens.color.textMuted },
    valueLabel: label,
  },
  /** Beside the plot when there is room: panels are wide and short, so a top key costs height. */
  legend: { placement: ['right', 'bottom'], gradientLength: 160 },
};
