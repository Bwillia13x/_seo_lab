import { test, expect } from '@playwright/test';

test.describe('CSV Exports', () => {
  test('Dashboard events export after logging an event', async ({ page }) => {
    // Trigger an event via UTM QR
    await page.goto('/apps/utm-qr');
    await page.getByRole('button', { name: /Generate/i }).click();

    // Go to Dashboard and export
    await page.goto('/apps/dashboard');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Export Events CSV/i }).click();
    try {
      await expect(page.getByTestId('download-ready')).toHaveAttribute('data-file', /belmont-events-last30/i, { timeout: 15000 });
    } catch {
      await expect(page.getByText(/Exported events CSV/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('GSC CTR Miner export analytics CSV', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');
    await page.getByRole('button', { name: /Load Belmont Sample Data/i }).click();
    await page.waitForTimeout(500);

    // Use Analytics export path for determinism
    const analyticsTab = page.getByRole('tab', { name: /^Analytics$/ });
    await analyticsTab.click();
    const runBtn = page.getByTestId('run-analytics');
    await expect(runBtn).toBeVisible({ timeout: 12000 });
    await runBtn.click();
    await page.getByRole('button', { name: /^Export CSV$/ }).click();
    try {
      await expect(page.getByTestId('download-ready')).toHaveAttribute('data-file', /enhanced-search-analytics-/i, { timeout: 15000 });
    } catch {
      await expect(page.getByText(/Exported GSC analytics CSV/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('Ranking Grid export CSV', async ({ page }) => {
    await page.goto('/apps/rank-grid');
    const gridTab = page.getByRole('tab', { name: 'Grid Input' });
    await gridTab.click();
    await page.getByRole('button', { name: /Load Demo/i }).click();
    await page.getByRole('button', { name: /Export Rank Grid CSV/i }).click();
    await expect(page.getByText(/Exported Rank Grid CSV/i)).toBeVisible({ timeout: 12000 });
  });
});
