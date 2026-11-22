/** Formatted value (docs/lld/formatted-value.md): one way to print a number everywhere. */
import { format as d3Format } from 'd3';
import { useMemo } from 'react';
import type { FormattedValueProps } from '../../../docs/lld/formatted-value.props';
import { cn } from '../../lib/cn';

export type { FormattedValueProps };

export const isPresent = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function FormattedValue({ value, format, size = 'body' }: FormattedValueProps) {
  const fmt = useMemo(() => d3Format(format), [format]);
  const className = cn(
    'tabular-nums!',
    size === 'kpi' &&
      '[font:var(--kpi-value-typography-font)] tracking-(--kpi-value-typography-letter-spacing) text-(color:--kpi-value-text)',
  );
  if (!isPresent(value))
    return (
      <span className={cn(className, 'text-(color:--color-text-muted)')}>
        <span aria-hidden>—</span>
        <span className="sr-only">no data</span>
      </span>
    );
  return <span className={className}>{fmt(value)}</span>;
}
