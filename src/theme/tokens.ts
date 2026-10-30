/**
 * Design tokens — phase 1 placeholder for the design language.
 *
 * Every renderer derives its look from here (CSS variables, Vega-Lite config, Plotly layout,
 * D3 components). Do not hard-code colors or fonts anywhere else. In phase 2 this file is
 * generated from DTCG token JSON by Style Dictionary; keep the export shape stable.
 */
export const tokens = {
  font: {
    family: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    sizeLabel: 11,
    sizeTitle: 13,
  },
  color: {
    background: '#f7f7f5',
    surface: '#ffffff',
    border: '#e4e4e0',
    text: '#1d1d1b',
    textMuted: '#6b6b66',
    grid: '#ececea',
    accent: '#2f5bea',
  },
  /** Categorical palette; order matters (first series gets the first color). */
  categorical: [
    '#2f5bea',
    '#e3742f',
    '#1f9d74',
    '#b4458f',
    '#8a7a18',
    '#4a9bd6',
    '#c94747',
    '#6e5bbf',
  ],
  /** Light → dark ramp for sequential encodings (heatmaps). */
  sequential: ['#eef2fd', '#c9d6fa', '#93aef4', '#5a83ec', '#2f5bea', '#1f3ea6'],
  space: { gap: 16, panelPadding: 16, radius: 10 },
} as const;

export type Tokens = typeof tokens;
