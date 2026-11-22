import { useMemo } from 'react';
import type { Row } from '../data/transforms';
import type { VegaLitePanel } from '../spec/types';
import { useTheme } from '../theme/ThemeProvider';
import { VegaView } from './VegaView';
import { buildVegaLiteSpec } from './vegaLiteSpec';

export function VegaLiteChart({ panel, rows }: { panel: VegaLitePanel; rows: Row[] }) {
  const { theme } = useTheme();
  const spec = useMemo(() => buildVegaLiteSpec(panel, rows, theme), [panel, rows, theme]);
  return (
    <div className="chart-fill">
      <VegaView spec={spec} />
    </div>
  );
}
