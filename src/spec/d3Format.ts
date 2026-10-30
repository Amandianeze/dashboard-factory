import { formatSpecifier } from 'd3';
import { z } from 'zod';

/** A d3-format specifier ("$,.0f", ".1%", "~s"). Invalid specifiers fail spec validation. */
export const D3FormatString = z.string().refine(
  (s) => {
    try {
      formatSpecifier(s);
      return true;
    } catch {
      return false;
    }
  },
  (s) => ({ message: `invalid d3-format specifier "${s}" (quote it in YAML: '$,.0f')` }),
);
