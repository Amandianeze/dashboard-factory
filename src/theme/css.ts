import { tokens } from './tokens';

/** Expose tokens as CSS custom properties so stylesheets never hard-code values. */
export function applyTokensToCss(root: HTMLElement = document.documentElement) {
  const vars: Record<string, string | number> = {
    '--font': tokens.font.family,
    '--bg': tokens.color.background,
    '--surface': tokens.color.surface,
    '--border': tokens.color.border,
    '--text': tokens.color.text,
    '--text-muted': tokens.color.textMuted,
    '--accent': tokens.color.accent,
    '--gap': `${tokens.space.gap}px`,
    '--pad': `${tokens.space.panelPadding}px`,
    '--radius': `${tokens.space.radius}px`,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, String(v));
}
