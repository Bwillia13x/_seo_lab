import { test, expect } from '@playwright/test';

test.describe('Search Performance (CTR Miner)', () => {
  test('loads sample data and runs analytics', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');

    // Load Belmont sample data
    await page.getByRole('button', { name: /Load Belmont Sample Data/i }).click();

    // Short wait for UI hydrate
    await page.waitForTimeout(500);

    // Switch to Analytics tab (disambiguate from "Run Analytics" button)
    await page.getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByText(/Search Analytics Summary/i)).toBeVisible({ timeout: 12000 });

    // Wait for Run Analytics button to be enabled
    const runBtn = page.getByTestId('run-analytics');
    await expect(runBtn).toBeVisible({ timeout: 12000 });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // Expect KPIs like Total Queries to appear
    await expect(page.getByText(/Total Queries/i)).toBeVisible();
  });
});
