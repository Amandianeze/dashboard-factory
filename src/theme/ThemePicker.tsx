/**
 * Theme picker for the app shell: the Select atom with System (follow the OS), Light, Dark and
 * High contrast. Hosts that theme the page themselves (embedded) leave it out.
 */
import { Select } from '../components/ui/select';
import type { ThemeName } from './generated/themes';
import { useTheme } from './ThemeProvider';

const LABELS: Record<ThemeName, string> = { light: 'Light', dark: 'Dark', hc: 'High contrast' };
const NAMES = Object.keys(LABELS) as ThemeName[];

export function ThemePicker() {
  const { picked, setTheme } = useTheme();
  return (
    <Select
      label="Theme"
      options={NAMES.map((n) => LABELS[n])}
      value={picked ? LABELS[picked] : null}
      allLabel="System"
      onChange={(label) => setTheme(NAMES.find((n) => LABELS[n] === label) ?? null)}
    />
  );
}
