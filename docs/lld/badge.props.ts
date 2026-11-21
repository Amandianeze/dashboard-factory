/** Badge (docs/lld/badge.md). Proposed (Gate 2 gap: order status). */
import type { ReactNode } from 'react';

export const BADGE_TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

export interface BadgeProps {
  /** Status colour. Never the only signal: the text must say the status. */
  tone?: BadgeTone;
  /** The status text, e.g. "Shipped". Required. */
  children: ReactNode;
  /** Optional leading Icon atom (decorative). */
  icon?: ReactNode;
}
