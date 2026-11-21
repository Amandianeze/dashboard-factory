/**
 * Reference D3 component. Pattern: React owns the DOM, D3 does the math (scales, format, rollups).
 * Copy this structure for new charts; register them in catalog.ts and registry.tsx.
 *
 * Styling: colours and type come from CSS custom properties (generated from tokens), so a theme
 * switch restyles the SVG without a re-render; layout numbers come from the resolved tokens.
 */
import { format, scaleBand, scaleLinear } from 'd3';
import { useMemo } from 'react';
import { groupAggregate } from '../../data/transforms';
import { useTheme } from '../../theme/ThemeProvider';
import type { RankedBarsProps } from './catalog';
import type { D3ChartProps } from './registry';

const label = {
  font: 'var(--chart-label-typography-font)',
  letterSpacing: 'var(--chart-label-typography-letter-spacing)',
};

export function RankedBars({ data, props, width, height }: D3ChartProps<RankedBarsProps>) {
  const { category, value, aggregate, limit, valueFormat } = props;
  const geometry = useTheme().tokens.chart;
  const size = geometry['ranked-bars'];

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
  const innerW = Math.max(0, width - size['label-width'] - size['value-width']);
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
      style={{ overflow: 'visible' }}
    >
      {ranked.map((d) => {
        const top = y(d.key) ?? 0;
        const mid = top + y.bandwidth() / 2;
        return (
          <g key={d.key}>
            <title>{`${d.key}: ${fmt(d.value)}`}</title>
            <text
              x={size['label-width'] - size['label-gap']}
              y={mid}
              textAnchor="end"
              dominantBaseline="middle"
              style={{ ...label, fill: 'var(--chart-label-text)' }}
            >
              {d.key}
            </text>
            <rect
              x={size['label-width']}
              y={top}
              width={x(d.value)}
              height={y.bandwidth()}
              rx={geometry.mark['bar-radius']}
              style={{ fill: 'var(--color-data-categorical-1)' }}
            />
            <text
              x={size['label-width'] + x(d.value) + size['value-gap']}
              y={mid}
              dominantBaseline="middle"
              style={{ ...label, fill: 'var(--chart-label-text-strong)' }}
            >
              {fmt(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
