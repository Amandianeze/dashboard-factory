/**
 * Every dashboard must render in every theme, and the Foundations page must show every theme.
 * Light-theme pixels are covered by dashboards.spec.ts; here dark and high contrast are checked for
 * errors and drawn panels, and Foundations gets one baseline (light, the page shows all themes).
 */
import { expect, test } from '@playwright/test';
import { checkSpecFile, listSpecFiles } from '../../scripts/lib/specs';
import { THEMES } from '../../src/theme/generated/themes';

const specs = listSpecFiles()
  .map((f) => checkSpecFile(f).spec)
  .filter((s) => s !== undefined);

for (const theme of THEMES.filter((t) => t !== 'light'))
  for (const spec of specs)
    test(`${spec.id} renders in the ${theme} theme`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(`/?theme=${theme}#/d/${spec.id}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const [id, panel] of Object.entries(spec.panels)) {
        const el = page.getByTestId(`panel-${id}`);
        await expect(el.getByRole('alert'), `panel ${id} error`).toHaveCount(0);
        const drawn =
          panel.renderer === 'kpi'
            ? el.locator('.kpi-value')
            : el.locator(panel.renderer === 'table' ? 'table' : 'svg').first();
        await expect(drawn, `panel ${id} drew nothing`).toBeVisible({ timeout: 15_000 });
      }
      expect(errors).toEqual([]);
    });

test('foundations shows every theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/foundations');
  for (const theme of THEMES)
    await expect(page.locator(`section.foundations-theme[data-theme="${theme}"]`)).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page).toHaveScreenshot('foundations.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('the theme picker switches, remembers, and goes back to the system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?theme=hc#/d/revenue-overview');
  const picker = page.getByRole('combobox', { name: 'Theme' });
  await expect(picker).toHaveValue('High contrast');

  await picker.selectOption('Dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(new URL(page.url()).searchParams.has('theme')).toBe(false);
  await expect(page.getByTestId('panel-orders_vs_revenue').locator('svg').first()).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(picker).toHaveValue('Dark');

  await picker.selectOption('System');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
