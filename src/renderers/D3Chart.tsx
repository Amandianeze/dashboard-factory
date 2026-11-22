import { useEffect, type ComponentType } from 'react';
import { d3Registry, type D3ChartProps } from '../components/d3/registry';
import { d3Charts, isD3ChartName } from '../components/d3/charts';
import type { OnChartData } from '../data/chartData';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { D3Panel } from '../spec/types';

export function D3Chart({
  panel,
  rows,
  onData,
}: {
  panel: D3Panel;
  rows: Row[];
  onData?: OnChartData;
}) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  if (!isD3ChartName(panel.component)) throw new Error(`Unknown D3 chart "${panel.component}"`);
  // Props were validated against the catalog in validateDashboard().
  const Chart = d3Registry[panel.component] as ComponentType<D3ChartProps<unknown>>;
  const entry = d3Charts[panel.component];
  useEffect(() => {
    onData?.(entry.chartData(rows, entry.propsSchema.parse(panel.props)));
  }, [entry, rows, panel.props, onData]);
  return (
    <div ref={ref} className="chart-fill">
      {width > 0 && height > 0 && (
        <Chart data={rows} props={panel.props} width={width} height={height} />
      )}
    </div>
  );
}
