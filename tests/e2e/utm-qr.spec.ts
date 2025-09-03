import { test, expect } from '@playwright/test';

test.describe('UTM QR Builder', () => {
  test('can generate a link and render QR preview', async ({ page }) => {
    await page.goto('/apps/utm-qr');

    // Fill base URL
    const baseInput = page.getByLabel('Booking URL', { exact: false });
    await baseInput.fill('https://thebelmontbarber.ca/book');

    // Choose a preset
    const preset = page.getByLabel('Preset');
    await preset.selectOption({ label: 'GBP Post' });

    // Generate
    await page.getByRole('button', { name: /Generate/i }).click();

    // Verify a link was built (Links Built KPI shows 1)
    await expect(page.getByText('Links Built')).toBeVisible();
    await expect(page.getByText(/^1$/)).toBeVisible();

    // Basic presence check on the page after generation
    await expect(page.getByText(/QR Ready/i)).toBeVisible();
  });
});

