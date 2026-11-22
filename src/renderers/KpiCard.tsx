import type { KpiCardProps } from '../../docs/lld/kpi-card.props';
import { KpiValue } from '../components/panels/kpi-value';
import { FormattedValue } from '../components/ui/formatted-value';
import { aggregate } from '../data/transforms';

export type { KpiCardProps };

export function KpiCard({ panel, rows }: KpiCardProps) {
  const value = aggregate(rows, panel.field, panel.aggregate);
  const { comparison } = panel;
  return (
    <div className="kpi">
      {comparison ? (
        <div className="kpi-value">
          <KpiValue
            current={value}
            previous={aggregate(rows, comparison.compareTo.field, panel.aggregate)}
            format={panel.format}
            comparison={comparison}
          />
        </div>
      ) : (
        <span className="kpi-value">
          <FormattedValue value={value} format={panel.format} size="kpi" />
        </span>
      )}
    </div>
  );
}
