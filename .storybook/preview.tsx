/**
 * Storybook preview (CSF Factories). Toolbar globals: theme, density, host, motion.
 * Every story renders inside the real ThemeProvider, so components read the same tokens as the app.
 */
import addonA11y from '@storybook/addon-a11y';
import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';
import '../src/theme/generated/tokens.css';
import '../src/theme/tailwind.css';
import '../src/styles.css';
import { TooltipGroup } from '../src/components/ui/tooltip';
import type { DensityName, ThemeName } from '../src/theme/generated/themes';
import { ThemeProvider } from '../src/theme/ThemeProvider';

export default definePreview({
  addons: [addonDocs(), addonA11y()],
  tags: ['autodocs'],
  parameters: {
    // Axe violations fail the story's test (principle 6: accessible by construction).
    a11y: { test: 'error' },
    layout: 'padded',
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark', 'hc'],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Density',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: ['comfortable', 'compact'],
        dynamicTitle: true,
      },
    },
    // Host theming (Fabric / portal) arrives in Phase 7; the global is wired now.
    host: {
      description: 'Host',
      toolbar: {
        title: 'Host',
        icon: 'browser',
        items: ['standalone', 'fabric'],
        dynamicTitle: true,
      },
    },
    motion: {
      description: 'Motion',
      toolbar: { title: 'Motion', icon: 'play', items: ['full', 'reduce'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light', density: 'comfortable', host: 'standalone', motion: 'full' },
  decorators: [
    (Story, { globals }) => {
      const root = document.documentElement;
      root.dataset.host = String(globals.host);
      root.dataset.motion = String(globals.motion);
      return (
        <ThemeProvider theme={globals.theme as ThemeName} density={globals.density as DensityName}>
          <TooltipGroup>
            <div className="sb-canvas">
              <Story />
            </div>
          </TooltipGroup>
        </ThemeProvider>
      );
    },
  ],
});
