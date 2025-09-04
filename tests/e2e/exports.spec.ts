import { test, expect } from '@playwright/test';

test.describe('CSV Exports', () => {
  test('Dashboard events export after logging an event', async ({ page }) => {
    // Trigger an event via UTM QR
    await page.goto('/apps/utm-qr');
    await page.getByRole('tab', { name: 'Single Link' }).click();
    await page.getByRole('button', { name: /Generate/i }).click();

    // Go to Dashboard and export
    await page.goto('/apps/dashboard');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Events CSV/i }).click(),
    ]);
    const name = download.suggestedFilename();
    expect(name).toMatch(/belmont-events-last30/i);
  });

  test('GSC CTR Miner export recommendations', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');
    await page.getByRole('button', { name: /Load Belmont Sample Data/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Recommendations/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/belmont-gsc-recs/i);
  });

  test('Ranking Grid export CSV', async ({ page }) => {
    await page.goto('/apps/rank-grid');
    await page.getByRole('tab', { name: 'Grid Input' }).click();
    await page.getByRole('button', { name: /Load Demo/i }).click();
    await page.getByRole('button', { name: /Save Snapshot/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export CSV/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/belmont-rank-grid/i);
  });
});

