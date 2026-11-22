/**
 * Delta indicator (docs/lld/delta-indicator.md). The glyph follows the sign, the colour follows
 * sign × polarity, and screen readers get words ("up 0.36%"), not glyphs.
 */
import { format as d3Format } from 'd3';
import { useMemo } from 'react';
import type { DeltaIndicatorProps } from '../../../docs/lld/delta-indicator.props';
import { cn } from '../../lib/cn';
import { isPresent } from './formatted-value';

export type { DeltaIndicatorProps };

type Direction = 'up' | 'down' | 'flat';
const GLYPH: Record<Direction, string> = { up: '▲', down: '▼', flat: '●' };
const TONE = {
  good: 'text-(color:--kpi-delta-positive-text)',
  bad: 'text-(color:--kpi-delta-negative-text)',
  neutral: 'text-(color:--delta-neutral-text)',
} as const;

/** Which colour role a change gets. Exported for tests. */
export function deltaTone(value: number, polarity: DeltaIndicatorProps['polarity'] = 'up-is-good') {
  if (value === 0 || polarity === 'neutral') return 'neutral';
  const up = value > 0;
  return (polarity === 'up-is-good') === up ? 'good' : 'bad';
}

export function DeltaIndicator({
  value,
  format,
  polarity = 'up-is-good',
  comparisonLabel,
}: DeltaIndicatorProps) {
  const fmt = useMemo(() => d3Format(format), [format]);
  const base =
    'inline-flex items-baseline gap-(--delta-gap) tabular-nums! [font:var(--delta-typography-font)] tracking-(--delta-typography-letter-spacing)';
  if (!isPresent(value))
    return (
      <span className={cn(base, TONE.neutral)}>
        <span aria-hidden>—</span>
        <span className="sr-only">no change data</span>
      </span>
    );
  const direction: Direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  // Unsigned magnitude for the spoken text: drop the leading sign the signed format adds.
  const magnitude = fmt(Math.abs(value)).replace(/^[+−-]/, '');
  const spoken = direction === 'flat' ? `unchanged` : `${direction} ${magnitude}`;
  return (
    <span className={cn(base, TONE[deltaTone(value, polarity)])}>
      <span aria-hidden>{GLYPH[direction]}</span>
      <span aria-hidden>{fmt(value)}</span>
      <span className="sr-only">
        {spoken}
        {comparisonLabel ? ` ${comparisonLabel}` : ''}
      </span>
    </span>
  );
}
