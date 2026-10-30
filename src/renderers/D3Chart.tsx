import type { ComponentType } from 'react';
import { d3Registry, type D3ChartProps } from '../components/d3/registry';
import { isD3ChartName } from '../components/d3/catalog';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { D3Panel } from '../spec/types';

export function D3Chart({ panel, rows }: { panel: D3Panel; rows: Row[] }) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  if (!isD3ChartName(panel.component)) throw new Error(`Unknown D3 chart "${panel.component}"`);
  // Props were validated against the catalog in validateDashboard().
  const Chart = d3Registry[panel.component] as ComponentType<D3ChartProps<unknown>>;
  return (
    <div ref={ref} className="chart-fill">
      {width > 0 && height > 0 && (
        <Chart data={rows} props={panel.props} width={width} height={height} />
      )}
    </div>
  );
}
