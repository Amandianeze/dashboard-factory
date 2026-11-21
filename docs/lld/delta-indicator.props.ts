/** Delta indicator (docs/lld/delta-indicator.md). Proposed. */
export interface DeltaIndicatorProps {
  /** The signed change. 0 renders as neutral; null/NaN renders as an em dash. */
  value: number | null;
  /** A signed d3-format, e.g. "+,.2f" or "+.2%" (until the format module lands). */
  format: string;
  /** Which direction is good. Colour follows it; the glyph always follows the sign. */
  polarity?: 'up-is-good' | 'down-is-good' | 'neutral';
  /** Screen-reader phrase, e.g. "versus previous close". */
  comparisonLabel?: string;
}
