import { test, expect } from '@playwright/test';

test.describe('Review Composer', () => {
  test('loads sample, opens a review, and (optionally) triggers AI', async ({ page }) => {
    await page.goto('/apps/review-composer');

    // Switch to Review Queue tab first
    await page.getByRole('tab', { name: 'Review Queue' }).click();

    // Load sample reviews
    await page.getByRole('button', { name: /Load Sample/i }).click();

    // Expect queue to show at least one review (look for a star rating badge)
    await expect(page.getByText(/⭐/).first()).toBeVisible();

    // Click first Reply button
    await page.getByRole('button', { name: /^Reply$/ }).first().click();

    // Switch to Reply Composer tab
    await page.getByRole('tab', { name: 'Reply Composer' }).click();

    // Ensure Reply Composer tab is active
    await expect(page.getByRole('tab', { name: 'Reply Composer' })).toHaveAttribute('data-state', 'active');

    // If AI button is enabled, click it
    const aiButton = page.getByRole('button', { name: /AI Generate/i });
    if (await aiButton.isEnabled()) {
      await aiButton.click();
      // Ensure composer section still visible, indicating no fatal error
      await expect(page.getByText(/CASL\/PIPEDA Note/i)).toBeVisible();
    }
  });
});

