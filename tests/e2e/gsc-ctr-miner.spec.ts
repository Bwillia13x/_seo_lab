import { test, expect } from '@playwright/test';

test.describe('Search Performance (CTR Miner)', () => {
  test('loads sample data and runs analytics', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');

    // Load Belmont sample data
    await page.getByRole('button', { name: /Load Belmont Sample Data/i }).click();

    // Switch to Analytics tab and run
    await page.getByRole('tab', { name: /^Analytics$/ }).click();
    const runBtn = page.getByRole('button', { name: /Run Analytics/i });
    if (await runBtn.isEnabled()) {
      await runBtn.click();
    }

    // Expect KPIs like Total Queries to appear
    await expect(page.getByText(/Total Queries/i)).toBeVisible();
  });
});

