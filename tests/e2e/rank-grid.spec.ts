import { test, expect } from '@playwright/test';

test.describe('Ranking Grid', () => {
  test('load demo, change keyword, save snapshot', async ({ page }) => {
    await page.goto('/apps/rank-grid');

    // Load demo grid
    await page.getByRole('button', { name: /Load Demo/i }).click();
    // Ensure grid inputs appear
    await expect(page.getByText(/Grid Input/i)).toBeVisible();

    // Change keyword
    const kw = page.getByLabel('Keyword');
    await kw.fill('barber calgary');
    await kw.press('Enter');

    // Save snapshot
    await page.getByRole('button', { name: /Save Snapshot/i }).click();
    // Expect snapshot section visible
    await expect(page.getByText(/Snapshots/)).toBeVisible();
  });
});

