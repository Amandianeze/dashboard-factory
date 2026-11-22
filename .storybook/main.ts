import type { StorybookConfig } from '@storybook/react-vite';

/** Storybook 10, CSF Factories. Uses the project's vite.config.ts (Tailwind, React). */
const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    // Agents look components and stories up over MCP at http://localhost:6006/mcp (storybook dev).
    '@storybook/addon-mcp',
  ],
  // Fixtures (public/data) for organism and template stories.
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
};
export default config;
