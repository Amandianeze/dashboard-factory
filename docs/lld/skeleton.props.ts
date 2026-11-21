/** Skeleton (docs/lld/skeleton.md). Proposed. */
export interface SkeletonProps {
  /**
   * Shape preset sized from tokens, so callers never pass raw lengths:
   * text = lines of body text · kpi = one KPI value · chart = the panel body · table = rows.
   */
  variant: 'text' | 'kpi' | 'chart' | 'table';
  /** Lines (text) or rows (table). Default 3. */
  count?: number;
}
