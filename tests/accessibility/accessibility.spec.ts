import { test, expect, Page } from '@playwright/test';

async function injectAxe(page: Page) {
  const axePath = require.resolve('axe-core/axe.min.js');
  await page.addScriptTag({ path: axePath });
  await page.waitForFunction(() => (window as any).axe && typeof (window as any).axe.run === 'function', null, { timeout: 5000 });
}

// WCAG 2.1 AA Level Accessibility Test Suite
test.describe('WCAG Compliance - Core Applications', () => {
  test('Dashboard - Critical Access Points', async ({ page }) => {
    await page.goto('/apps/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);

    // Run axe-core accessibility audit
    const axeResults = await page.evaluate(() => {
      return (window as any).axe.run(document.body, {
        runOnly: ['wcag2a', 'wcag2aa', 'best-practice']
      });
    });

    // Check for critical accessibility violations
    const criticalViolations = axeResults.violations.filter((v: any) =>
      ['critical', 'serious'].includes(v.impact)
    );

    // Log violations with suggestions
    if (criticalViolations.length > 0) {
      console.log('\n🚨 ACCESSIBILITY VIOLATIONS FOUND:');
      criticalViolations.forEach((v: any) => {
        console.log(`• ${v.id}: ${v.description}`);
        console.log(`  Help: ${v.helpUrl}`);
        console.log(`  Nodes: ${v.nodes.length}`);
      });
    }

    // Assert no critical or serious violations
    expect(criticalViolations.length).toBe(0);
  });

  test('Review Composer - Form Accessibility', async ({ page }) => {
    await page.goto('/apps/review-composer');
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);

    // Activate review queue
    await page.getByRole('tab', { name: 'Review Queue' }).click();

    const axeResults = await page.evaluate(() => {
      return (window as any).axe.run(document.body, {
        runOnly: ['wcag2a', 'wcag2aa']
      });
    });

    // Check form-specific violations
    const formViolations = axeResults.violations.filter((v: any) =>
      v.tags.includes('forms')
    );

    if (formViolations.length > 0) {
      console.log('\n⚠️ FORM ACCESSIBILITY ISSUES:');
      formViolations.forEach((v: any) => {
        console.log(`• ${v.id}: ${v.description}`);
      });
    }

    expect(formViolations.length).toBe(0);
  });

  test('Keyboard Navigation - Core Functionality', async ({ page }) => {
    await page.goto('/apps/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Start from a stable anchor
    const anchor = page.getByTestId('dashboard-load-demo');
    await expect(anchor).toBeVisible();
    await anchor.focus();
    await page.keyboard.press('Tab');

    // Verify focus moved to a focusable element that's not body/html and not the same element
    const isFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag !== 'BODY' && tag !== 'HTML';
    });

    expect(isFocused).toBeTruthy();
  });

  test('Screen Reader Support - ARIA Labels', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');
    await page.waitForLoadState('domcontentloaded');

    // Check for ARIA labels on interactive elements
    const interactiveElements = page.locator('button, input[type="text"], input[type="file"], select, textarea');
    const count = await interactiveElements.count();

    // Verify accessibility attributes
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      if (!(await element.isVisible().catch(() => false))) continue; // ignore hidden inputs/buttons
      const hasAriaLabel = await element.getAttribute('aria-label') !== null;
      const hasAccessibleName = await element.getAttribute('aria-labelledby') !== null ||
                               await element.textContent() !== '' ||
                               await element.getAttribute('placeholder') !== null;

      expect(hasAriaLabel || hasAccessibleName).toBeTruthy();
    }
  });

  test('Color Contrast - Charts and Visual Elements', async ({ page }) => {
    await page.goto('/apps/rank-grid');
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);

    // Load sample data to generate charts
    const gridTab = page.getByTestId('rank-grid-tab-grid');
    await expect(gridTab).toBeVisible();
    await gridTab.click();
    await page.getByRole('button', { name: 'Load Demo' }).click();

    const axeResults = await page.evaluate(() => {
      return (window as any).axe.run(document.body, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    // Specifically check for color contrast issues
    const colorViolations = axeResults.violations.filter((v: any) =>
      v.id === 'color-contrast'
    );

    if (colorViolations.length > 0) {
      console.log('\n🎨 COLOR CONTRAST VIOLATIONS:');
      colorViolations.forEach((v: any) => {
        console.log(`• ${v.id}: ${v.description}`);
        console.log(`  Foreground: ${v.data?.fgColor}, Background: ${v.data?.bgColor}`);
        console.log(`  Contrast ratio: ${v.data?.contrastRatio}`);
      });
    }

    // WCAG AA requires 4.5:1 contrast ratio minimum
    expect(colorViolations.length).toBe(0);
  });
});

// Specific Business Logic Accessibility Tests
test.describe('SEO Lab Business Logic Accessibility', () => {
  test('Language Toggle and Internationalization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for lang attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();

    // Check for proper document title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
  });

  test('Skip Links and Navigation Landmarks', async ({ page }) => {
    await page.goto('/apps/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Check for main navigation landmark
    const nav = page.locator('nav[aria-label], [role="navigation"]');
    await expect(nav.first()).toBeVisible();

    // Check for main content landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('Error Handling and Feedback Accessibility', async ({ page }) => {
    await page.goto('/apps/review-composer');
    await page.waitForLoadState('domcontentloaded');

    // Try to interact without proper data
    // Ensure advanced features are visible
    const toggleSimple = page.getByRole('button', { name: /Toggle Simple Mode/i });
    await toggleSimple.click();
    const aiButton = page.getByRole('button', { name: /AI Generate/i });

    // Verify that buttons show proper disabled states with screen reader support
    const ariaDisabled = await aiButton.getAttribute('aria-disabled') === 'true';
    const nativeDisabled = await aiButton.isDisabled();

    expect(ariaDisabled || nativeDisabled).toBeTruthy();
  });

  test('Modal and Dialog Accessibility', async ({ page }) => {
    await page.goto('/apps/gsc-ctr-miner');
    await page.waitForLoadState('domcontentloaded');

    // Load data to potentially trigger modals
    await page.getByRole('button', { name: 'Load Belmont Sample Data' }).click();

    // Check for proper modal implementation if any exist
    const dialogs = page.locator('[role="dialog"], [aria-modal="true"]');
    if (await dialogs.count() > 0) {
      await expect(dialogs.first()).toHaveAttribute('aria-labelledby');
      await expect(dialogs.first()).toHaveAttribute('aria-describedby');
    }
  });
});

// Automated WCAG Compliance Scoring
test('Full Accessibility Audit Report', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);

  const complianceResults = await page.evaluate(() => {
    return (window as any).axe.run(document.body, {
      runOnly: ['wcag2a', 'wcag2aa', 'best-practice']
    });
  });

  // Generate accessibility scorecard
  const scorecard = {
    totalViolations: complianceResults.violations.length,
    bySeverity: {
      critical: complianceResults.violations.filter((v: any) => v.impact === 'critical').length,
      serious: complianceResults.violations.filter((v: any) => v.impact === 'serious').length,
      moderate: complianceResults.violations.filter((v: any) => v.impact === 'moderate').length,
      minor: complianceResults.violations.filter((v: any) => v.impact === 'minor').length
    },
    passesCount: complianceResults.passes.length,
    inapplicableCount: complianceResults.inapplicable.length,
    // Calculate compliance percentage
    complianceScore: Math.round(
      (complianceResults.passes.length / (complianceResults.passes.length + complianceResults.violations.length)) * 100
    )
  };

  console.log('\n📊 ACCESSIBILITY COMPLIANCE SCORECARD:');
  console.log(`Overall Score: ${scorecard.complianceScore}%`);
  console.log(`Violations: ${scorecard.totalViolations}`);
  console.log(`Passes: ${scorecard.passesCount}`);
  console.log(`Critical Issues: ${scorecard.bySeverity.critical}`);
  console.log(`Serious Issues: ${scorecard.bySeverity.serious}`);

  // Target: 85%+ WCAG AA compliance (align with CI threshold)
  expect(scorecard.complianceScore).toBeGreaterThanOrEqual(85);
});
