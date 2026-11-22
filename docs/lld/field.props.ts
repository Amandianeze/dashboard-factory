/** Field (docs/lld/field.md). Proposed; composes Label + a control + help + error. */
import type { ReactElement } from 'react';

export interface FieldProps {
  /** Id given to the control; derived from `label` when omitted. */
  id?: string;
  label: string;
  /** The control (Input, Select, …). Field injects id, aria-describedby and aria-invalid. */
  children: ReactElement;
  /** Persistent hint below the control. */
  help?: string;
  /** Validation message; when set the control is invalid and the message is announced. */
  error?: string;
  required?: boolean;
}
