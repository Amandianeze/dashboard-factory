/** Button (docs/lld/button.md). Proposed: the interface the component is built to. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
export const BUTTON_SIZES = ['sm', 'md'] as const;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** primary: the one main action per view · secondary: default · ghost: low-emphasis (Clear). */
  variant?: (typeof BUTTON_VARIANTS)[number];
  size?: (typeof BUTTON_SIZES)[number];
  /** Default "button", so a button inside a form never submits by accident. */
  type?: 'button' | 'submit' | 'reset';
  /** Keeps focus and its label, sets aria-busy and aria-disabled, and ignores clicks (no spinner yet; Phase 6). */
  loading?: boolean;
  /** Leading Icon atom; decorative (the text is the name). */
  icon?: ReactNode;
  /** Visible text is required: icon-only buttons use `aria-label` and a Tooltip. */
  children: ReactNode;
}
