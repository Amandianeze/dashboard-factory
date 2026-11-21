/** Formatted value (docs/lld/formatted-value.md). Today inlined in KpiCard; extraction target. */
export interface FormattedValueProps {
  /** null, undefined and non-finite numbers render as an em dash with an accessible "no data". */
  value: number | null | undefined;
  /** A d3-format specifier, e.g. "$,.0f" (until the format module lands; ADR-002). */
  format: string;
  /** Type role: `kpi` uses kpi.value.typography, `body` inherits. Default `body`. */
  size?: 'kpi' | 'body';
}
