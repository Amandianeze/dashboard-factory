/**
 * Render every valid dashboard in a real browser: each panel must draw something, no console
 * errors, and the page must match its screenshot baseline (update with --update-snapshots).
 */
import { expect, test } from '@playwright/test';
import { checkSpecFile, listSpecFiles } from '../../scripts/lib/specs';

const specs = listSpecFiles()
  .map((f) => checkSpecFile(f).spec)
  .filter((s) => s !== undefined);

for (const spec of specs) {
  test(`${spec.id} renders every panel`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`/#/d/${spec.id}`);
    await expect(page.getByTestId(`dashboard-${spec.id}`)).toBeVisible();

    for (const [id, panel] of Object.entries(spec.panels)) {
      const el = page.getByTestId(`panel-${id}`);
      await expect(el, `panel ${id}`).toBeVisible();
      await expect(el.getByRole('alert'), `panel ${id} error`).toHaveCount(0);
      const drawn = panel.renderer === 'kpi' ? el.locator('.kpi-value') : el.locator('svg').first();
      await expect(drawn, `panel ${id} drew nothing`).toBeVisible({ timeout: 15_000 });
    }

    expect(errors).toEqual([]);

    // Per-panel baselines: small layout regressions (a moved legend, a collapsed chart) are a
    // large share of one panel's pixels but vanish inside a full-page diff.
    for (const id of Object.keys(spec.panels))
      await expect(page.getByTestId(`panel-${id}`), `panel ${id} visual`).toHaveScreenshot(
        `${spec.id}--${id}.png`,
        { animations: 'disabled' },
      );
    // Full page for humans reviewing PRs; looser threshold.
    await expect(page).toHaveScreenshot(`${spec.id}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
}
