/** Tooltip (docs/lld/tooltip.md). Proposed; built on Base UI Tooltip (ADR-003). */
import type { ReactElement, ReactNode } from 'react';

export interface TooltipProps {
  /** Supplementary text only. Never put the only copy of essential information here. */
  content: ReactNode;
  /** The trigger. Must be focusable (a Button or an info Icon button); hover alone is not enough. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}
