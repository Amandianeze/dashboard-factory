/**
 * Tooltip (docs/lld/tooltip.md). Base UI Tooltip: opens on hover after a delay and on keyboard
 * focus at once, closes on Escape, stays open while hovered (WCAG 1.4.13). Fades with motion
 * tokens; no fade under prefers-reduced-motion. Inside a TooltipGroup, once one tooltip has opened
 * its neighbours open at once and without the fade, so scanning a row of ⓘ icons doesn't wait.
 */
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';
import type { TooltipProps } from '../../../docs/lld/tooltip.props';
import { cn } from '../../lib/cn';
import { useTheme } from '../../theme/ThemeProvider';

export type { TooltipProps };

/** Shares the hover delay across tooltips; wrap the app once (main.tsx, Storybook preview). */
export function TooltipGroup({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return <BaseTooltip.Provider delay={tokens.motion.duration.base}>{children}</BaseTooltip.Provider>;
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const { tokens } = useTheme();
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} delay={tokens.motion.duration.base} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={tokens.tooltip.offset}>
          <BaseTooltip.Popup
            className={cn(
              'max-w-(--tooltip-max-width) rounded-(--tooltip-radius) px-(--tooltip-padding-x) py-(--tooltip-padding-y)',
              'bg-(--tooltip-bg) text-(color:--tooltip-text)',
              'border-(length:--border-width-hairline) border-solid border-(color:--tooltip-border)',
              '[font:var(--tooltip-typography-font)] tracking-(--tooltip-typography-letter-spacing)',
              'transition-opacity duration-(--motion-duration-fast) ease-(--motion-easing-out)',
              'data-starting-style:opacity-0 data-ending-style:opacity-0',
              'data-instant:transition-none motion-reduce:transition-none',
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
