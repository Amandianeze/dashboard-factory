/**
 * Badge (docs/lld/badge.md). The text says the status; the dot adds the status colour, so colour
 * is never the only signal (WCAG 1.4.1) and status colours never have to pass as text.
 */
import type { BadgeProps, BadgeTone } from '../../../docs/lld/badge.props';
import { cn } from '../../lib/cn';

export type { BadgeProps, BadgeTone };

// Full class names (not built from `tone`) so Tailwind can find them.
const DOT: Record<BadgeTone, string> = {
  neutral: 'bg-(--badge-neutral-dot)',
  info: 'bg-(--badge-info-dot)',
  success: 'bg-(--badge-success-dot)',
  warning: 'bg-(--badge-warning-dot)',
  danger: 'bg-(--badge-danger-dot)',
};

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center whitespace-nowrap gap-(--badge-gap) rounded-(--badge-radius)',
        'px-(--badge-padding-x) py-(--badge-padding-y) bg-(--badge-bg) text-(color:--badge-text)',
        'border-(length:--border-width-hairline) border-solid border-(color:--badge-border)',
        '[font:var(--badge-typography-font)] tracking-(--badge-typography-letter-spacing)',
      )}
    >
      {icon ?? (
        <span aria-hidden className={cn('size-(--badge-dot-size) rounded-full', DOT[tone])} />
      )}
      {children}
    </span>
  );
}
