import { useMemo } from 'react';
import type { Row } from '../data/transforms';
import type { VegaLitePanel } from '../spec/types';
import { VegaView } from './VegaView';
import { buildVegaLiteSpec } from './vegaLiteSpec';

export function VegaLiteChart({ panel, rows }: { panel: VegaLitePanel; rows: Row[] }) {
  const spec = useMemo(() => buildVegaLiteSpec(panel, rows), [panel, rows]);
  return (
    <div className="chart-fill">
      <VegaView spec={spec} />
    </div>
  );
}
