import { assembleVegaLite, type ChartAssemblyInput } from 'flint-chart';
import { stripPrivateKeys } from 'flint-chart/validate';
import type { TopLevelSpec } from 'vega-lite';
import type { Row } from '../data/transforms';
import { flintFieldRefs } from '../spec/schema';
import {
  bandStep,
  continuousSize,
  MIN_BAND_STEP,
  MIN_PLOT_HEIGHT,
  NO_FIT,
  type Compiled,
  type Fit,
} from './flintFit';
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
 * Apply a measured fit (see flintFit.ts). Width: a banded chart (heatmap) gives each x band an equal
 * share of the trim, down to MIN_BAND_STEP; a continuous one narrows its plot. Height: a continuous
 * plot takes back the room Flint reserved for things the panel doesn't draw, or gives up overflow.
 */
function applyFit(spec: Compiled, panel: FlintPanel, rows: Row[], fit: Fit): void {
  const view = spec.config?.view;
  if (fit.trimWidth > 0) {
    const step = bandStep(spec);
    const cw = continuousSize(spec, 'width');
    const x = panel.chart.encodings.x;
    const field = x === undefined ? undefined : flintFieldRefs({ x })[0];
    const bands = field ? new Set(rows.map((r) => r[field])).size : 0;
    if (step !== undefined && bands)
      spec.width = { step: Math.max(MIN_BAND_STEP, step - Math.ceil(fit.trimWidth / bands)) };
    else if (cw !== undefined && view) view.continuousWidth = cw - fit.trimWidth;
  }
  const ch = continuousSize(spec, 'height');
  if (fit.growHeight && ch !== undefined && view)
    view.continuousHeight = Math.max(MIN_PLOT_HEIGHT, ch + fit.growHeight);
}

/**
 * flint-chart 1.0.1 shrinks tick and legend text on dense charts (9px on the 78-candle intraday
 * chart) below the theme's `type.minSize`, which DESIGN.md makes the floor for chart text. Raise
 * every font size in the compiled spec (axes, legends, text marks) to the floor. Larger labels can
 * then collide, so where anything was raised, axes Flint marked `labelOverlap: false` let Vega-Lite
 * hide colliding labels instead. Re-check on Flint upgrades.
 */
function enforceTextFloor(spec: object, floor: number): void {
  const isSize = (k: string) => k === 'fontSize' || k.endsWith('FontSize');
  const walk = (
    node: unknown,
    visit: (o: Record<string, unknown>, key?: string) => void,
    key?: string,
  ): void => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, visit, key));
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    visit(o, key);
    for (const [k, v] of Object.entries(o)) if (k !== 'data') walk(v, visit, k);
  };
  let raised = false;
  walk(spec, (o) => {
    for (const [k, v] of Object.entries(o))
      if (isSize(k) && typeof v === 'number' && v < floor) {
        o[k] = floor;
        raised = true;
      }
  });
  if (raised)
    walk(spec, (o, key) => {
      if (key?.startsWith('axis') && o.labelOverlap === false) o.labelOverlap = true;
    });
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
 * `fit` corrects the size from a previous render's measurement (see FlintChart).
 */
export function buildFlintSpec(
  panel: FlintPanel,
  rows: Row[],
  semantics: DatasetSpec['semantics'],
  size: Size,
  theme: ThemeName = 'light',
  fit: Fit = NO_FIT,
): TopLevelSpec {
  const compiled = stripPrivateKeys(
    assembleVegaLite(buildFlintInput(panel, rows, semantics, size, theme)),
  );
  const spec = remapInks(compiled, HARDCODED_INKS(theme));
  delete spec.title;
  enforceTextFloor(spec, flintTheme[theme].type?.minSize ?? 0);
  applyFit(spec, panel, rows, fit);
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
