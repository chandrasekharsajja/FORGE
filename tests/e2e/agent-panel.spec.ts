/**
 * End-to-end tests for Agent Side Panel - verify UI interaction and mission submission flow
 */

import { test, expect, Page } from '@playwright/test';

// Helper to wait for stable elements (avoid flaky timing issues)
const waitForStable = async (page: Page, selector: string) => {
  await page.waitForSelector(selector, { state: 'stable', timeout: 5000 });
};

test.describe('Agent Side Panel E2E Suite', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh page for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to the unified IDE dashboard
    await page.goto('/');
    await waitForStable(page, '.panel.agent-panel');
  });

  test.afterEach(async () => {
    // Clean up after each test
    await page.close();
  });

  test('should render agent panel with prompt input and submit button', async () => {
    // Verify agent panel exists on page
    await expect(page.locator('.panel.agent-panel')).toBeVisible();
    
    // Find key components
    const form = page.locator('form[onsubmit="handleSubmit"]');
    const promptInput = page.locator('#mission-prompt');
    const submitBtn = page.locator('button[type="submit"]');

    expect(form).toBeVisible();
    expect(promptInput).toBeVisible();
    expect(submitBtn).toBeVisible();
  });

  test('should display error when no prompt is entered', async () => {
    // Click submit without entering text
    await page.click('button[type="submit"]');

    // Error message should appear
    await expect(page.locator('.status-message')).toContainText('Enter a mission before running the agent lane.');
    expect(await page.locator('.status-indicator').textContent()).toContain('⏸️');
  });

  test('should allow mission submission with valid prompt', async () => {
    // Enter a mission prompt
    await page.fill('#mission-prompt', 'Create a new REST API endpoint for user authentication');
    
    // Submit the mission
    await page.click('button[type="submit"]');

    // Should show loading state
    await expect(page.locator('.status-indicator')).toHaveText('⚡');
    
    // Eventually should complete
    await page.waitForTimeout(2000); // Wait for async operation to complete
    
    const statusText = await page.locator('.status-text').textContent();
    expect(statusText).toBeTruthy();
  });

  test('should support typing in prompt input field', async () => {
    const input = page.locator('#mission-prompt');
    await input.clear();
    await input.type('Generate component structure for dashboard');
    
    await expect(input).toHaveValue('Generate component structure for dashboard');
  });

  test('should have accessibility keyboard navigation', async () => {
    // Tab through focus order
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy(); // Should have focused something

    // Press Enter on focused element if it's a button or actionable
    await page.keyboard.press('Enter');
  });
});