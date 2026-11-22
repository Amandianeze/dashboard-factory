import { assembleVegaLite, type ChartAssemblyInput } from 'flint-chart';
import { stripPrivateKeys } from 'flint-chart/validate';
import type { TopLevelSpec } from 'vega-lite';
import type { Row } from '../data/transforms';
import { flintFieldRefs } from '../spec/schema';
import { bandStep, MIN_BAND_STEP } from './flintFit';
import type { DatasetSpec, FlintPanel } from '../spec/types';
import { flintTheme } from '../theme/generated/engines';
import { themes, type ThemeName } from '../theme/generated/themes';

export type Size = { width: number; height: number };

/**
 * Inks flint-chart 1.0.1 hard-codes in chart templates instead of reading the theme: the
 * candlestick up/down colours (Candlestick Chart template, `encoding.color`). Remapped to the
 * sign tokens after compiling. Re-check on every flint-chart upgrade; delete entries once Flint
 * reads `ink.series.status` for them.
 */
const HARDCODED_INKS = (theme: ThemeName): Record<string, string> => ({
  // raw-ok: Flint's literal, matched and replaced
  '#06982d': themes[theme].color.data.positive,
  // raw-ok: Flint's literal, matched and replaced
  '#ae1325': themes[theme].color.data.negative,
});

function remapInks<T>(node: T, inks: Record<string, string>): T {
  if (typeof node === 'string') return (inks[node.toLowerCase()] ?? node) as T;
  if (Array.isArray(node)) return node.map((n) => remapInks(n, inks)) as T;
  if (node && typeof node === 'object')
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, k === 'data' ? v : remapInks(v, inks)]),
    ) as T;
  return node;
}

/**
 * Flint keeps banded charts at a fixed reading size (56 px heatmap cells) and puts the colour key
 * beside the plot without reserving room for it, so in a narrow panel the chart overflows. Given
 * the measured overflow in px, narrow each x band by an equal share, down to MIN_BAND_STEP.
 */
function narrowBands(
  spec: { width?: unknown },
  panel: FlintPanel,
  rows: Row[],
  trim: number,
): void {
  const step = bandStep(spec);
  const x = panel.chart.encodings.x;
  if (trim <= 0 || step === undefined || x === undefined) return;
  const field = flintFieldRefs({ x })[0];
  const bands = field ? new Set(rows.map((r) => r[field])).size : 0;
  if (!bands) return;
  spec.width = { step: Math.max(MIN_BAND_STEP, step - Math.ceil(trim / bands)) };
}

/** Pure: the Flint input for a panel, sized to its layout cell. */
export function buildFlintInput(
  panel: FlintPanel,
  rows: Row[],
  semantics: DatasetSpec['semantics'],
  size: Size,
  theme: ThemeName = 'light',
): ChartAssemblyInput {
  const box = { width: Math.floor(size.width), height: Math.floor(size.height) };
  return {
    data: { values: rows },
    semantic_types: semantics ?? {},
    chart_spec: { ...panel.chart, baseSize: box, canvasSize: box },
    theme_spec: flintTheme[theme],
    options: { addTooltips: true },
  };
}

/**
 * Pure: compile a Flint panel to a render-ready Vega-Lite spec. Shared by the runtime renderer and
 * `npm run spec:validate`. The panel header already shows the title, so Flint's is dropped.
 * `trimWidth` is how far a previous render overflowed the panel (see FlintChart).
 */
export function buildFlintSpec(
  panel: FlintPanel,
  rows: Row[],
  semantics: DatasetSpec['semantics'],
  size: Size,
  theme: ThemeName = 'light',
  trimWidth = 0,
): TopLevelSpec {
  const compiled = stripPrivateKeys(
    assembleVegaLite(buildFlintInput(panel, rows, semantics, size, theme)),
  );
  const spec = remapInks(compiled, HARDCODED_INKS(theme));
  delete spec.title;
  narrowBands(spec, panel, rows, trimWidth);
  // Flint's static output tooltips dump the raw row; show the encoded fields, grouped by thousands.
  // Vega-Lite also puts numberFormat on quantitative axes, where Vega adds tick precision to a
  // specifier without a type (',' turns 7,690 into 7.69e+3), so give it an explicit precision.
  spec.config = {
    ...spec.config,
    numberFormat: spec.config?.numberFormat ?? ',.12~g',
    mark: { ...spec.config?.mark, tooltip: { content: 'encoding' } },
  };
  return spec as TopLevelSpec;
}
