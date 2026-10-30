/**
 * Reference D3 component. Pattern: React owns the DOM, D3 does the math (scales, format, rollups).
 * Copy this structure for new charts; register them in catalog.ts and registry.tsx.
 */
import { format, scaleBand, scaleLinear } from 'd3';
import { useMemo } from 'react';
import { groupAggregate } from '../../data/transforms';
import { tokens } from '../../theme/tokens';
import type { RankedBarsProps } from './catalog';
import type { D3ChartProps } from './registry';

const LABEL_W = 96;
const VALUE_W = 64;

export function RankedBars({ data, props, width, height }: D3ChartProps<RankedBarsProps>) {
  const { category, value, aggregate, limit, valueFormat } = props;

  const ranked = useMemo(
    () =>
      groupAggregate(data, [category], value, aggregate)
        .map((r) => ({ key: String(r[category]), value: Number(r[value]) }))
        .filter((r) => Number.isFinite(r.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit),
    [data, category, value, aggregate, limit],
  );

  const fmt = useMemo(() => format(valueFormat), [valueFormat]);
  const innerW = Math.max(0, width - LABEL_W - VALUE_W);
  const y = scaleBand<string>()
    .domain(ranked.map((d) => d.key))
    .range([0, height])
    .padding(0.28);
  const x = scaleLinear()
    .domain([0, Math.max(0, ...ranked.map((d) => d.value))])
    .nice()
    .range([0, innerW]);

  if (!ranked.length) return <p className="panel-empty">No data</p>;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`${value} by ${category}, ranked`}
      style={{ fontFamily: tokens.font.family, overflow: 'visible' }}
    >
      {ranked.map((d) => {
        const top = y(d.key) ?? 0;
        const mid = top + y.bandwidth() / 2;
        return (
          <g key={d.key}>
            <title>{`${d.key}: ${fmt(d.value)}`}</title>
            <text
              x={LABEL_W - 8}
              y={mid}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={tokens.font.sizeLabel}
              fill={tokens.color.textMuted}
            >
              {d.key}
            </text>
            <rect
              x={LABEL_W}
              y={top}
              width={x(d.value)}
              height={y.bandwidth()}
              rx={2}
              fill={tokens.categorical[0]}
            />
            <text
              x={LABEL_W + x(d.value) + 6}
              y={mid}
              dominantBaseline="middle"
              fontSize={tokens.font.sizeLabel}
              fill={tokens.color.text}
            >
              {fmt(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
