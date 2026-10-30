import { format } from 'd3';
import { aggregate, type Row } from '../data/transforms';
import type { KpiPanel } from '../spec/types';

export function KpiCard({ panel, rows }: { panel: KpiPanel; rows: Row[] }) {
  const value = aggregate(rows, panel.field, panel.aggregate);
  return (
    <div className="kpi">
      <span className="kpi-value">
        {Number.isFinite(value) ? format(panel.format)(value) : '—'}
      </span>
    </div>
  );
}
