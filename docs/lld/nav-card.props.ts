/** Navigation card (docs/lld/nav-card.md). Today inlined in App; extraction target. */
export interface NavCardProps {
  /** Link target, e.g. `#/d/<id>`. Omitted when the spec is invalid (card is not a link). */
  href?: string;
  title: string;
  description?: string;
  /** The spec file name, shown as a caption. */
  file: string;
  /** Validation errors; when present the card shows them instead of linking. */
  errors?: string[];
}
