/// <reference types="vitest/config" />
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle the lazily imported chart engines so Vite doesn't re-optimise (and reload) in the
  // middle of a Storybook or browser test run when a story first imports one.
  optimizeDeps: {
    include: [
      'vega-embed',
      'vega-lite',
      'flint-chart',
      'flint-chart/validate',
      'plotly.js-basic-dist-min',
      '@base-ui/react/button',
      '@base-ui/react/tooltip',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'd3',
      'zod',
    ],
  },
  build: {
    // Plotly is lazy-loaded into its own chunk; warn if the main bundle grows past budget.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        // Every story is a test: it must render, pass its play function and pass axe (a11y).
        extends: true,
        plugins: [storybookTest({ configDir: join(root, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
