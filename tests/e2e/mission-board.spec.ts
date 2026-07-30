/**
 * End-to-end tests for Mission Board - verify timeline visualization and status updates
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Mission Board E2E Suite', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should render mission tracks with stages', async () => {
    // Locate mission board
    await expect(page.locator('.mission-board')).toBeVisible();

    // Check mission track items exist
    const tracks = page.locator('.mission-track-item');
    expect(tracks).toHaveCount(5); // Should have default tracks

    // Verify each track has stage information
    for (let i = 0; i < 5; i++) {
      const stage = await page.locator(`.mission-track-item:nth-child(${i+1}) .stage-label`).textContent();
      expect(stage).toBeTruthy();
    }
  });

  test('should update track status on completion', async () => {
    // Get first track
    const firstTrack = page.locator('.mission-track-item:first-child');

    // Initial state should show pending status
    expect(await firstTrack.locator('.status-badge').textContent()).toContain('Pending');

    // Simulate completing a stage (click to mark complete)
    await firstTrack.click();
    
    // Status should change to completed
    await expect(firstTrack.locator('.status-badge')).toHaveText('Completed');
  });

  test('should display release checklist correctly', async () => {
    // Locate release checklist section
    const checklist = page.locator('.release-checklist');
    expect(checklist).toBeVisible();

    // Should have checklist items
    const items = checklist.locator('.checklist-item');
    expect(items).toHaveCount(4); // Default items: Design Review, Code Review, Testing, Documentation

    // First item should be unchecked initially
    expect(await items.first().locator('input[type="checkbox"]'). isChecked()).toBe(false);

    // Check checkbox
    await items.first().locator('input[type="checkbox"]').click();
    expect(await items.first().locator('input[type="checkbox"]'). isChecked()).toBe(true);
  });

  test('should scroll horizontally when too wide for viewport', async () => {
    // Mission board might have wider content than viewport
    const container = page.locator('.mission-board-container');
    const scrollbarWidth = await container.evaluate(el => el.scrollWidth - el.clientWidth);

    if (scrollbarWidth > 0) {
      // Should have horizontal scrolling capability
      await container.evaluate(el => el.scrollLeft += 100);
      
      const newScrollPosition = await container.evaluate(el => el.scrollLeft);
      expect(newScrollPosition).toBeGreaterThan(0);
    }
  });
});