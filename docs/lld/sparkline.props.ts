/** Sparkline (docs/lld/sparkline.md). Proposed; React renders, d3-shape computes the path. */
export interface SparklineProps {
  /** Ordered values; null makes a gap, not a zero. */
  values: (number | null)[];
  /** Required text alternative, e.g. "Close, 5-minute bars, up 0.4% since open". */
  label: string;
  /** Marks the last point (the value the KPI shows). Default true. */
  highlightLast?: boolean;
}
