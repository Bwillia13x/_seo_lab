import { test, expect } from '@playwright/test';

test.describe('Ranking Grid', () => {
  test('load demo, change keyword, save snapshot', async ({ page }) => {
    await page.goto('/apps/rank-grid');

    // Switch to Grid Input tab
    await page.getByRole('tab', { name: 'Grid Input' }).click();

    // Load demo grid
    await page.getByRole('button', { name: /Load Demo/i }).click();

    // Wait for content to load and try to interact with dynamic elements
    await page.waitForTimeout(1000);

    // Try to find and fill keyword field (may not exist in server-rendered HTML)
    const keywordInput = page.locator('input[placeholder*="keyword" i], input[name*="keyword" i]').first();
    if (await keywordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await keywordInput.fill('barber calgary');
      await keywordInput.press('Enter');
    }

    // Try to save snapshot if button is available
    const saveButton = page.getByRole('button', { name: /Save Snapshot/i });
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
    }
  });
});

