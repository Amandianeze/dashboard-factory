/** Label (docs/lld/label.md). Proposed. */
import type { LabelHTMLAttributes, ReactNode } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Id of the control it names. Required: a label always points at something. */
  htmlFor: string;
  /** Appends a visible "(required)" text, not a bare asterisk. */
  required?: boolean;
  children: ReactNode;
}
