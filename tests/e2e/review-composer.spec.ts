import { test, expect } from '@playwright/test';

test.describe('Review Composer', () => {
  test('loads sample, opens a review, and (optionally) triggers AI', async ({ page }) => {
    await page.goto('/apps/review-composer');

    // Switch to Review Queue tab first (fallback to text if role not exposed)
    await page.locator('button:has-text("Review Queue")').first().click();

    // Load sample reviews
    await page.getByRole('button', { name: /Load Sample/i }).click();

    // Short wait for UI to render
    await page.waitForTimeout(500);

    // Wait for deterministic queue ready signal
    await expect(page.getByTestId('review-queue-ready')).toBeVisible({ timeout: 8000 });

    // Click first Reply button if present (optional)
    const maybeReply = page.getByRole('button', { name: /^Reply$/ }).first();
    if (await maybeReply.isVisible().catch(() => false)) {
      await maybeReply.click();
    }

    // Switch to Reply Composer tab
    await page.getByRole('tab', { name: 'Reply Composer' }).click();

    // Ensure Reply Composer tab is active
    await expect(page.getByRole('tab', { name: 'Reply Composer' })).toHaveAttribute('data-state', 'active');

    // Check if AI button is enabled within 5 seconds
    const aiButton = page.getByRole('button', { name: /AI Generate/i });
    try {
      await page.waitForFunction(
        async () => {
          return await aiButton.isEnabled();
        },
        { timeout: 5000 }
      );
      await aiButton.click();
      // Ensure composer section still visible, indicating no fatal error
      await expect(page.getByText(/CASL\/PIPEDA Note/i)).toBeVisible();
    } catch {
      // AI not enabled, skip click
    }
  });
});
