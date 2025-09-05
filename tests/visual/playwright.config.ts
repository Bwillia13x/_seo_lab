import { defineConfig, devices } from '@playwright/test';

// Visual Regression Testing Configuration
// Optimized for screenshot comparison and visual consistency

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './test-results/visual',
  testIgnore: '**/github.com/**',

  // Timeout settings for visual tests (longer for screenshot capture)
  timeout: 120000, // 2 minutes
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      threshold: 0.03, // 3% pixel difference threshold to reduce flakiness
    },
  },

  // Visual regression snapshot configuration
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'changed' : undefined,

  // Browser configuration
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    screenshot: 'only-on-failure', // Save failed screenshots
    trace: 'on-first-retry',
    headless: process.env.CI === 'true', // Headful for interactive, headless for CI
    viewport: { width: 1280, height: 720 }, // Default viewport
  },

  // Screenshot configurations are set in project use blocks
  // screenshotDir and videoDir are handled by project configurations

  // Projects for different visual test scenarios
  projects: [
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /\.spec\.ts$/,
    },
    {
      name: 'visual-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /\.spec\.ts$/,
    },
    {
      name: 'visual-mobile',
      use: {
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 428, height: 926 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /.spec.ts$/,
    },
  ],

  // Custom reporter for visual test results
  reporter: process.env.CI === 'true'
    ? [['github'], ['json', { outputFile: 'visual-test-results.json' }]]
    : [['list'], ['json', { outputFile: 'visual-test-results.json' }]],

  // WebServer configuration for visual tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },

  // Global setup and teardown
  globalSetup: './tests/visual/setup.ts',
  globalTeardown: './tests/visual/teardown.ts',
});
