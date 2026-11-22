/**
 * KPI value with delta (docs/lld/kpi-value.md). One figure, its change and change %, and what it
 * is compared with, read as one sentence by screen readers.
 */
import type { KpiValueProps } from '../../../docs/lld/kpi-value.props';
import { DeltaIndicator } from '../ui/delta-indicator';
import { FormattedValue, isPresent } from '../ui/formatted-value';

export type { KpiValueProps };

/** delta = current − previous; delta % = delta / |previous| (null when previous is 0 or missing). */
export function computeDeltas(current: number | null, previous: number | null) {
  if (!isPresent(current) || !isPresent(previous)) return { delta: null, deltaPct: null };
  const delta = current - previous;
  return { delta, deltaPct: previous === 0 ? null : delta / Math.abs(previous) };
}

export function KpiValue({ current, previous, format, comparison }: KpiValueProps) {
  const { delta, deltaPct } = computeDeltas(current, previous);
  const versus = `versus ${comparison.label}`;
  return (
    <div className="flex flex-wrap items-baseline gap-x-(--kpi-delta-gap)">
      <FormattedValue value={current} format={format} size="kpi" />
      {/* Its own font: otherwise the line box inherits the KPI size and lifts the value. */}
      <p className="m-[0] flex flex-wrap items-baseline gap-(--kpi-delta-gap) [font:var(--kpi-comparison-typography-font)]">
        {comparison.show.includes('delta') && (
          <DeltaIndicator
            value={delta}
            format={comparison.deltaFormat}
            polarity={comparison.polarity}
            comparisonLabel={versus}
          />
        )}
        {comparison.show.includes('delta-pct') && (
          <DeltaIndicator
            value={deltaPct}
            format={comparison.deltaPctFormat}
            polarity={comparison.polarity}
            comparisonLabel={versus}
          />
        )}
        <span className="[font:var(--kpi-comparison-typography-font)] tracking-(--kpi-comparison-typography-letter-spacing) text-(color:--kpi-comparison-text)">
          vs {comparison.label} <FormattedValue value={previous} format={format} />
        </span>
      </p>
    </div>
  );
}
