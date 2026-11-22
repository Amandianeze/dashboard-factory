/**
 * Active theme and density. Sets `data-theme` / `data-density` on <html> (which switches the
 * generated CSS variables) and exposes the same choice to JS renderers that need concrete values
 * (Vega-Lite, Flint and Plotly configs).
 *
 * Choice, in order: `?theme=` / `?density=` in the URL, then the system (prefers-contrast: more →
 * hc, prefers-color-scheme: dark → dark), then light / comfortable.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DENSITIES,
  THEMES,
  densities,
  themes,
  type DensityName,
  type ResolvedDensity,
  type ResolvedTheme,
  type ThemeName,
} from './generated/themes';

export interface ThemeState {
  theme: ThemeName;
  density: DensityName;
  tokens: ResolvedTheme;
  space: ResolvedDensity;
}

const fromList = <T extends string>(list: readonly T[], v: string | null): T | undefined =>
  list.find((x) => x === v);

function systemTheme(): ThemeName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  if (window.matchMedia('(prefers-contrast: more)').matches) return 'hc';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function initial(): { theme: ThemeName; density: DensityName; explicit: boolean } {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const theme = fromList(THEMES, params.get('theme'));
  const density = fromList(DENSITIES, params.get('density')) ?? 'comfortable';
  return { theme: theme ?? systemTheme(), density, explicit: !!theme };
}

const state = (theme: ThemeName, density: DensityName): ThemeState => ({
  theme,
  density,
  tokens: themes[theme],
  space: densities[density],
});

const ThemeContext = createContext<ThemeState>(state('light', 'comfortable'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ theme, density, explicit }, setChoice] = useState(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.density = density;
  }, [theme, density]);

  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const queries = ['(prefers-contrast: more)', '(prefers-color-scheme: dark)'].map((q) =>
      window.matchMedia(q),
    );
    const update = () => setChoice((c) => ({ ...c, theme: systemTheme() }));
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, [explicit]);

  return <ThemeContext.Provider value={state(theme, density)}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
