/**
 * Empty state (docs/lld/empty-state.md): one answer to "why is there nothing here?" for every
 * panel. empty and filtered are polite status messages; error is an alert.
 */
import type { EmptyStateProps } from '../../../docs/lld/empty-state.props';
import { cn } from '../../lib/cn';

export type { EmptyStateProps };

export function EmptyState({
  variant,
  title,
  description,
  action,
  size = 'regular',
}: EmptyStateProps) {
  const error = variant === 'error';
  return (
    <div
      role={error ? 'alert' : 'status'}
      data-variant={variant}
      className={cn(
        'flex h-full flex-col gap-(--empty-state-gap)',
        size === 'regular' ? 'items-center justify-center text-center' : 'justify-end',
      )}
    >
      <p
        className={cn(
          'm-0 [font:var(--empty-state-title-typography-font)] tracking-(--empty-state-title-typography-letter-spacing)',
          error ? 'text-(color:--empty-state-error-text)' : 'text-(color:--empty-state-title-text)',
        )}
      >
        {title}
      </p>
      {description && size === 'regular' && (
        <p className="m-0 [font:var(--empty-state-description-typography-font)] text-(color:--empty-state-description-text)">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
