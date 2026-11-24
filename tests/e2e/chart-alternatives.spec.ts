/**
 * Every chart on every dashboard has a text alternative (docs/lld/chart-panel.md): a described
 * image, and a keyboard-reachable table of what it plots that follows the filters.
 */
import { expect, test } from '@playwright/test';
import { checkSpecFile, listSpecFiles } from '../../scripts/lib/specs';

const specs = listSpecFiles()
  .map((f) => checkSpecFile(f).spec)
  .filter((s) => s !== undefined);

for (const spec of specs)
  test(`${spec.id}: every chart has a summary and a table view`, async ({ page }) => {
    await page.goto(`/#/d/${spec.id}`);
    for (const [id, panel] of Object.entries(spec.panels)) {
      if (panel.kind !== 'chart-panel') continue;
      const el = page.getByTestId(`panel-${id}`);
      const image = el.getByRole('img', { name: panel.title, exact: true }).first();
      await expect(image).toHaveAccessibleDescription(/[\d,]+ data points?/, { timeout: 15_000 });

      const toggle = el.getByRole('button', { name: `Table view of ${panel.title}` });
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(el.getByRole('table', { name: panel.title })).toBeVisible();
      await expect(image).toBeHidden();
      await page.keyboard.press('Tab');
      await expect(el.getByRole('region', { name: `${panel.title} table` })).toBeFocused();
      await toggle.press('Enter');
      await expect(el.getByRole('table')).toHaveCount(0);
      await expect(image).toBeVisible();
    }
  });

test('an open table and the summary follow the filters', async ({ page }) => {
  await page.goto('/#/d/revenue-overview');
  const el = page.getByTestId('panel-heatmap');
  await el.getByRole('button', { name: /^Table view of/ }).click();
  const rows = el.locator('tbody tr');
  await expect(rows).toHaveCount(16);
  const filters = page.getByRole('group', { name: 'Filters' });
  await filters.getByRole('button', { name: 'East', exact: true }).click();
  await expect(rows).toHaveCount(4);
  await expect(el.locator('[id$="-summary"]')).toHaveText(/4 data points/);
});

test('a filter change is announced, and panel descriptions reach screen readers', async ({
  page,
}) => {
  await page.goto('/#/d/revenue-overview');
  const announced = page.getByTestId('filter-status');
  await expect(page.getByTestId('panel-trend')).toBeVisible();
  await expect(announced).toHaveText('');
  await page
    .getByRole('group', { name: 'Filters' })
    .getByRole('button', { name: 'East', exact: true })
    .click();
  await expect(announced).toHaveText('Filtered by Region: East.');
  await expect(announced).toHaveRole('status');

  const about = page.getByTestId('panel-by_product').getByRole('button', { name: /^About / });
  await expect(about).toHaveAccessibleDescription('Bespoke D3 chart from the component catalog.');
});
