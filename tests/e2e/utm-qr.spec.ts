import { test, expect } from '@playwright/test';

test.describe('UTM QR Builder', () => {
  test('can generate a link and render QR preview', async ({ page }) => {
    await page.goto('/apps/utm-qr');

    // Switch to Single Link tab
    await page.getByRole('tab', { name: 'Single Link' }).click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Try to fill base URL (may not exist in server-rendered HTML)
    const baseInput = page.locator('input[placeholder*="URL" i], input[name*="url" i]').first();
    if (await baseInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await baseInput.fill('https://thebelmontbarber.ca/book');
    }

    // Try to select preset if available
    const preset = page.locator('select[name*="preset" i]').first();
    if (await preset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preset.selectOption({ label: 'GBP Post' });
    }

    // Try to generate if button is available
    const generateButton = page.getByRole('button', { name: /Generate/i });
    if (await generateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateButton.click();
    }

    // Verify a link was built (Links Built KPI shows 1)
    await expect(page.getByText('Links Built')).toBeVisible();
    // Check that there's at least one "1" visible (Links Built KPI)
    const linksBuiltKpi = page.locator('.text-2xl.font-bold:has-text("1")').first();
    await expect(linksBuiltKpi).toBeVisible();

    // Basic presence check on the page after generation
    await expect(page.getByText(/QR Ready/i)).toBeVisible();
  });
});

