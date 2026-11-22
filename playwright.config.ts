import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // A committed test.only would otherwise pass CI while skipping every other test.
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  // Baselines are only compared inside the pinned Playwright container, where rendering is
  // deterministic, so any changed pixel is a real change: a one-letter typo or a slightly different
  // colour used to fit inside the old 0.2% / 1% allowances. threshold is the per-pixel colour
  // tolerance (0–1, YIQ); 0.05 still ignores sub-visible antialiasing jitter.
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.05 } },
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // After the spread: the device preset brings its own 1280x720 viewport.
        viewport: { width: 1440, height: 1000 },
        // Optional: point at a preinstalled Chromium (sandboxed CI, offline machines).
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
