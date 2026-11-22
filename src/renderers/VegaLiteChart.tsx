import { useMemo } from 'react';
import type { OnChartData } from '../data/chartData';
import type { Row } from '../data/transforms';
import type { VegaLitePanel } from '../spec/types';
import { useTheme } from '../theme/ThemeProvider';
import { VegaView } from './VegaView';
import { buildVegaLiteSpec } from './vegaLiteSpec';

export function VegaLiteChart({
  panel,
  rows,
  onData,
}: {
  panel: VegaLitePanel;
  rows: Row[];
  onData?: OnChartData;
}) {
  const { theme } = useTheme();
  const spec = useMemo(() => buildVegaLiteSpec(panel, rows, theme), [panel, rows, theme]);
  return (
    <div className="chart-fill">
      <VegaView spec={spec} onData={onData} />
    </div>
  );
}
