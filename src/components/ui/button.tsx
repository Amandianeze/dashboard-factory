/**
 * Button (docs/lld/button.md). Base UI Button + cva variants; every value is a button.* token.
 */
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonProps } from '../../../docs/lld/button.props';
import { cn } from '../../lib/cn';

export type { ButtonProps };

export const buttonVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center whitespace-nowrap',
    'gap-(--button-gap) rounded-(--button-radius) px-(--button-padding-x) py-(--button-padding-y)',
    'border-(length:--border-width-hairline) border-solid',
    '[font:var(--button-typography-font)] tracking-(--button-typography-letter-spacing)',
    'focus-visible:outline-(length:--button-focus-width) focus-visible:outline-solid',
    'focus-visible:outline-(color:--button-focus-ring) focus-visible:outline-offset-(--button-focus-offset)',
    'active:bg-(--button-pressed-bg) active:text-(color:--button-pressed-text)',
    'data-disabled:cursor-not-allowed data-disabled:bg-(--button-disabled-bg)',
    'data-disabled:text-(color:--button-disabled-text) data-disabled:border-transparent',
    'aria-busy:cursor-progress',
  ],
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-(--button-primary-bg) text-(color:--button-primary-text) hover:bg-(--button-primary-hover-bg) hover:text-(color:--button-primary-hover-text)',
        secondary:
          'border-(color:--button-secondary-border) bg-(--button-secondary-bg) text-(color:--button-secondary-text) hover:bg-(--button-secondary-hover-bg) hover:text-(color:--button-secondary-hover-text)',
        ghost:
          'border-transparent bg-transparent text-(color:--button-ghost-text) hover:bg-(--button-ghost-hover-bg) hover:text-(color:--button-ghost-hover-text)',
      },
      size: {
        md: '',
        sm: 'px-(--space-inline-sm) py-(--space-stack-2xs)',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
  variant,
  size,
  type = 'button',
  loading = false,
  icon,
  disabled,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <BaseButton
      {...rest}
      type={type}
      disabled={disabled || loading}
      // Loading keeps focus (and the announcement) on the button; disabled stays native.
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {icon}
      {children}
    </BaseButton>
  );
}
