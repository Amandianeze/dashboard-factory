/**
 * Fitting Flint's banded charts to narrow panels. Kept apart from flintSpec.ts so the always-loaded
 * FlintChart can read these without pulling in the lazily loaded Flint compiler.
 */

/** Narrowest band (heatmap column) a fit will go to: about a short category label at 11px. */
export const MIN_BAND_STEP = 32;

/** The x band step of a compiled spec, if its width is banded (`{ step }`). */
export function bandStep(spec: { width?: unknown }): number | undefined {
  const step = (spec.width as { step?: unknown } | undefined)?.step;
  return typeof step === 'number' ? step : undefined;
}
