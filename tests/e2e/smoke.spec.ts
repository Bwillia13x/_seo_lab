import { test, expect } from '@playwright/test';

const tools = [
  'addon-recommender',
  'citation-tracker',
  'dashboard',
  'gbp-composer',
  'gsc-ctr-miner',
  'link-map',
  'link-prospect-kit',
  'meta-planner',
  'neighbor-signal',
  'noshow-shield',
  'onboarding',
  'post-oracle',
  'post-studio',
  'queuetime',
  'rank-grid',
  'rankgrid-watcher',
  'referral-qr',
  'review-composer',
  'review-link',
  'rfm-crm',
  'seo-brief',
  'slot-yield',
  'utm-dashboard',
  'utm-qr'
];

test.describe('Smoke Tests for Tools', () => {
  tools.forEach((tool) => {
    test(`Smoke test ${tool}`, async ({ page }) => {
      await page.goto(`/apps/${tool}`);
      // Check for a heading without requiring full network idle
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
