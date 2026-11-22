import { format } from 'd3';
import { aggregate } from '../data/transforms';
import type { KpiCardProps } from '../../docs/lld/kpi-card.props';

export type { KpiCardProps };

export function KpiCard({ panel, rows }: KpiCardProps) {
  const value = aggregate(rows, panel.field, panel.aggregate);
  return (
    <div className="kpi">
      <span className="kpi-value">
        {Number.isFinite(value) ? format(panel.format)(value) : '—'}
      </span>
    </div>
  );
}
