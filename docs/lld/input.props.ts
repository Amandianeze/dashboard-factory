/** Input (docs/lld/input.md). Proposed. */
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** text | search | email | number | url | tel | password; dates use a future DatePicker. */
  type?: 'text' | 'search' | 'email' | 'number' | 'url' | 'tel' | 'password';
  /** Sets aria-invalid and the error border; the message itself lives in Field. */
  invalid?: boolean;
}
