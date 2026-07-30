import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FORGE Unified IDE end-to-end tests
 */
export default defineConfig({
  // General test settings
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  // Run all tests in parallel using worker processes
  workers: process.env.CI ? 1 : undefined,
  // Fail the build if any tests fail
  preserveExitCode: true,
  
  // Global setup/teardown files before/all tests
  globalSetup: '@playwright/test/global-setup',
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),

  // Reporter configuration
  reporter: [
    ['list'], // Default list reporter
    ['html', { open: 'never' }], // HTML report (open never = don't auto-open)
    ['junit', { outputFile: 'test-results/test-results.xml' }], // JUnit format for CI
  ],

  // Baseline screenshots/reports directory
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',

  // Projects targeting different browsers and devices
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile iPhone 12',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Tablet iPad',
      use: { ...devices['iPad Pro 12.9'] },
    },
  ],

  // Use baseURL to target different environments (dev/staging/prod)
  use: {
    // Common settings across all projects
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Test environment configuration
  env: {
    // Override environment variables for tests
    NODE_ENV: 'test',
    TESTING_ENABLED: 'true',
  },
});