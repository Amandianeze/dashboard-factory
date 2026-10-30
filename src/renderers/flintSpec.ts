import { assembleVegaLite, type ChartAssemblyInput } from 'flint-chart';
import { stripPrivateKeys } from 'flint-chart/validate';
import type { TopLevelSpec } from 'vega-lite';
import type { Row } from '../data/transforms';
import type { DatasetSpec, FlintPanel } from '../spec/types';
import { flintTheme } from '../theme/flintTheme';

export type Size = { width: number; height: number };

/** Pure: the Flint input for a panel, sized to its layout cell. */
export function buildFlintInput(
  panel: FlintPanel,
  rows: Row[],
  semantics: DatasetSpec['semantics'],
  size: Size,
): ChartAssemblyInput {
  const box = { width: Math.floor(size.width), height: Math.floor(size.height) };
  return {
    data: { values: rows },
    semantic_types: semantics ?? {},
    chart_spec: { ...panel.chart, baseSize: box, canvasSize: box },
    theme_spec: flintTheme,
    options: { addTooltips: true },
  };
}

/**
 * Pure: compile a Flint panel to a render-ready Vega-Lite spec. Shared by the runtime renderer and
 * `npm run spec:validate`. The panel header already shows the title, so Flint's is dropped.
 */
export function buildFlintSpec(
  panel: FlintPanel,
  rows: Row[],
  semantics: DatasetSpec['semantics'],
  size: Size,
): TopLevelSpec {
  const spec = stripPrivateKeys(assembleVegaLite(buildFlintInput(panel, rows, semantics, size)));
  delete spec.title;
  // Flint's static output tooltips dump the raw row; show the encoded fields, grouped by thousands.
  spec.config = {
    ...spec.config,
    numberFormat: spec.config?.numberFormat ?? ',',
    mark: { ...spec.config?.mark, tooltip: { content: 'encoding' } },
  };
  return spec as TopLevelSpec;
}
