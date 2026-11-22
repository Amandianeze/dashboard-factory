/**
 * Fitting Flint charts to their panel. Flint sizes the plot from the box it is given but draws some
 * things outside it (a heatmap's colour key beside fixed-size cells) and reserves room for others
 * the panel drops (its own title), so the drawn chart can be wider or shorter than the panel.
 * FlintChart measures each render and rebuilds with a `Fit`. Kept apart from flintSpec.ts so the
 * always-loaded FlintChart can read these without pulling in the lazily loaded Flint compiler.
 */

/** px taken from the chart's width, and px added to (or, negative, taken from) its plot height. */
export type Fit = { trimWidth: number; growHeight: number };
export const NO_FIT: Fit = { trimWidth: 0, growHeight: 0 };

/** Narrowest band (heatmap column) a fit will go to: about a short category label at 11px. */
export const MIN_BAND_STEP = 32;
/** Shortest plot a height fit will leave. */
export const MIN_PLOT_HEIGHT = 80;

export type Compiled = {
  width?: unknown;
  height?: unknown;
  config?: { view?: Record<string, unknown> };
};

/** The x band step of a compiled spec, if its width is banded (`{ step }`). */
export function bandStep(spec: Compiled): number | undefined {
  const step = (spec.width as { step?: unknown } | undefined)?.step;
  return typeof step === 'number' ? step : undefined;
}

/** A continuous plot dimension Flint left to `config.view`, if the spec doesn't fix it. */
export function continuousSize(spec: Compiled, dim: 'width' | 'height'): number | undefined {
  if (spec[dim] !== undefined) return undefined;
  const v = spec.config?.view?.[dim === 'width' ? 'continuousWidth' : 'continuousHeight'];
  return typeof v === 'number' ? v : undefined;
}

/** Whether a rebuild could make the chart narrower. */
export function canTrimWidth(spec: Compiled): boolean {
  const step = bandStep(spec);
  return step !== undefined ? step > MIN_BAND_STEP : continuousSize(spec, 'width') !== undefined;
}

/** Whether a rebuild could change the plot's height. */
export function canFitHeight(spec: Compiled): boolean {
  return continuousSize(spec, 'height') !== undefined;
}
