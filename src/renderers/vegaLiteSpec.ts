import type { TopLevelSpec } from 'vega-lite';
import type { Row } from '../data/transforms';
import type { VegaLitePanel } from '../spec/types';
import { vegaLiteConfig } from '../theme/vegaTheme';

/**
 * Build the full Vega-Lite spec for a panel: inject data, container sizing and the token theme.
 * Shared by the runtime renderer and by `npm run spec:validate` (which compiles every panel).
 */
export function buildVegaLiteSpec(panel: VegaLitePanel, rows: Row[]): TopLevelSpec {
  const { config, ...rest } = panel.spec as { config?: Record<string, unknown> };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    ...rest,
    data: { values: rows },
    width: 'container',
    height: 'container',
    autosize: { type: 'fit', contains: 'padding' },
    config: { ...vegaLiteConfig, ...(config ?? {}) },
  } as TopLevelSpec;
}
