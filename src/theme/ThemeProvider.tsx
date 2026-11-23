/**
 * Active theme and density. Sets `data-theme` / `data-density` on <html> (which switches the
 * generated CSS variables) and exposes the same choice to JS renderers that need concrete values
 * (Vega-Lite, Flint and Plotly configs).
 *
 * Choice, in order: `?theme=` / `?density=` in the URL, then the theme picked in the app (saved in
 * this browser), then the system (prefers-contrast: more → hc, prefers-color-scheme: dark → dark),
 * then light / comfortable. `setTheme(null)` goes back to following the system.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  /** The theme picked explicitly (URL or picker); null when following the system. */
  picked: ThemeName | null;
  /** Pick a theme (saved in this browser), or null to follow the system again. */
  setTheme: (theme: ThemeName | null) => void;
}

const STORAGE_KEY = 'factory.theme';

// Storage can throw (private windows, blocked site data); the picker then lasts for the visit.
function stored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function store(theme: ThemeName | null) {
  try {
    if (theme) window.localStorage.setItem(STORAGE_KEY, theme);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved; the choice still applies until reload.
  }
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
  if (typeof window === 'undefined')
    return { theme: 'light', density: 'comfortable', explicit: false };
  const params = new URLSearchParams(window.location.search);
  const theme = fromList(THEMES, params.get('theme')) ?? fromList(THEMES, stored());
  const density = fromList(DENSITIES, params.get('density')) ?? 'comfortable';
  return { theme: theme ?? systemTheme(), density, explicit: !!theme };
}

const state = (
  theme: ThemeName,
  density: DensityName,
  picked: ThemeName | null,
  setTheme: ThemeState['setTheme'],
): ThemeState => ({
  theme,
  density,
  tokens: themes[theme],
  space: densities[density],
  picked,
  setTheme,
});

const ThemeContext = createContext<ThemeState>(state('light', 'comfortable', null, () => {}));

export function ThemeProvider({
  children,
  theme: forcedTheme,
  density: forcedDensity,
}: {
  children: ReactNode;
  /** Forces a theme (Storybook toolbar); otherwise ?theme= or the system preference. */
  theme?: ThemeName;
  /** Forces a density (Storybook toolbar); otherwise ?density= or comfortable. */
  density?: DensityName;
}) {
  const [choice, setChoice] = useState(initial);
  const theme = forcedTheme ?? choice.theme;
  const density = forcedDensity ?? choice.density;
  const explicit = choice.explicit || forcedTheme !== undefined;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.density = density;
  }, [theme, density]);

  const setTheme = useCallback((picked: ThemeName | null) => {
    store(picked);
    // A ?theme= in the URL would win on reload over the new pick; drop it.
    const url = new URL(window.location.href);
    if (url.searchParams.has('theme')) {
      url.searchParams.delete('theme');
      window.history.replaceState(window.history.state, '', url);
    }
    setChoice((c) => ({ ...c, theme: picked ?? systemTheme(), explicit: picked !== null }));
  }, []);

  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const queries = ['(prefers-contrast: more)', '(prefers-color-scheme: dark)'].map((q) =>
      window.matchMedia(q),
    );
    const update = () => setChoice((c) => ({ ...c, theme: systemTheme() }));
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, [explicit]);

  const value = useMemo(
    () => state(theme, density, explicit ? theme : null, setTheme),
    [theme, density, explicit, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
