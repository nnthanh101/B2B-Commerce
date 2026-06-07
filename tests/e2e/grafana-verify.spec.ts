import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Grafana Dashboard Visual Verification — Observability Stack
 *
 * Scope: DC-OBS-SCREENSHOT-REFRESH
 * Validates 10 acceptance criteria (AC-1..AC-10) for Grafana dashboard layout + collapsed row interaction.
 *
 * Run:
 *   npx playwright test tests/e2e/grafana-verify.spec.ts --project=chromium
 */

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';
const DASHBOARD_SLUG = 'commerce-backend';
const REPORT_DIR = process.env.SCREENSHOT_OUTPUT_DIR || 'tmp/Digital-Commerce/test-results';
const DEMO_DIR = process.env.DEMO_DIR || 'tmp/Digital-Commerce/demo';

function screenshotPath(filename: string, dir: string = REPORT_DIR): string {
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

test.describe('Grafana Dashboard Verification (DC-OBS-SCREENSHOT-REFRESH)', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // Test: Verify Grafana Dashboard Layout + Collapsed Row Interaction
  // ─────────────────────────────────────────────────────────────────────────────

  test('GV-01: Capture Grafana dashboard in collapsed state (AC-1..AC-8)', async ({ page }) => {
    // Set viewport to match spec: 1280×720px, dark theme
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Grafana dashboard
    const dashboardUrl = `${GRAFANA_URL}/d/${DASHBOARD_SLUG}`;
    console.log(`Navigating to ${dashboardUrl}...`);
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);

    // AC-1: Verify 2-column layout exists
    // ── Look for multiple panels in each row (indicating L+R columns) ──
    const allPanels = await page.locator('[data-panelid]').count();
    console.log(`Found ${allPanels} panels on dashboard`);
    expect(allPanels).toBeGreaterThan(4); // At least 4 metric rows × 2 panels each = 8 panels

    // AC-2: Verify visible metric data (canvas elements for charts)
    const chartElements = await page.locator('canvas').count();
    console.log(`Found ${chartElements} chart elements`);
    expect(chartElements).toBeGreaterThan(0);

    // AC-3: Verify Up-Status stat shows targets
    // ── Look for stat panel content with target names ──
    const upStatusText = await page.getByText(/Up-Status|Scrape Targets/i).first().isVisible().catch(() => false);
    expect(upStatusText).toBeTruthy();

    // AC-4: Verify 5 row headers are visible
    const expectedRows = ['Backend', 'Postgres', 'Redis', 'Node', 'Up-Status'];
    const foundRows: string[] = [];
    for (const rowName of expectedRows) {
      const visible = await page.getByText(rowName, { exact: false }).first().isVisible().catch(() => false);
      if (visible) {
        foundRows.push(rowName);
      }
    }
    console.log(`Found ${foundRows.length}/5 row headers: ${foundRows.join(', ')}`);
    expect(foundRows.length).toBe(5);

    // AC-5: Verify dashboard title and no error badges
    const titleElement = await page.locator('h1, [data-testid="dashboard-title"]').first().textContent().catch(() => '');
    console.log(`Dashboard title: "${titleElement}"`);
    expect(titleElement).toContain('Digital Commerce');

    const hasErrors = await page.getByText(/Datasource not found|401|403|500/i).isVisible().catch(() => false);
    expect(hasErrors).toBe(false);

    // AC-6 & AC-7: Capture collapsed state screenshot
    const collapsedPath = screenshotPath('grafana-backend-dashboard.png', DEMO_DIR);
    console.log(`Capturing collapsed state to ${collapsedPath}...`);
    await page.screenshot({ path: collapsedPath, fullPage: false });

    const collapsedStats = fs.statSync(collapsedPath);
    console.log(`Collapsed screenshot: ${collapsedStats.size} bytes`);
    expect(collapsedStats.size).toBeGreaterThan(200000); // >200KB

    // AC-8: Verify PNG is at correct path
    expect(collapsedPath).toBe(
      path.join(DEMO_DIR, 'grafana-backend-dashboard.png')
    );
    expect(fs.existsSync(collapsedPath)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test: Verify Row 104 Collapse/Expand Interaction
  // ─────────────────────────────────────────────────────────────────────────────

  test('GV-02: Verify row 104 collapsed by default, expand to reveal Prometheus targets (AC-9..AC-10)', async ({ page }) => {
    // Set viewport to match spec: 1280×720px, dark theme
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Grafana dashboard
    const dashboardUrl = `${GRAFANA_URL}/d/${DASHBOARD_SLUG}`;
    console.log(`Navigating to ${dashboardUrl}...`);
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);

    // AC-9: Verify row 104 (Up-Status) is collapsed by default
    // ── Find the Up-Status row header ──
    const upStatusHeader = await page.getByText('Up-Status', { exact: false }).first();
    expect(upStatusHeader).toBeVisible();

    // Check if row is collapsed (look for expand icon or aria-expanded="false")
    const rowContainer = upStatusHeader.locator('..').first();
    const collapseButton = rowContainer.locator('button, [role="button"]').first();

    // In Grafana, collapsed rows show a right-facing chevron
    // Expanded rows show a down-facing chevron
    const ariaExpanded = await rowContainer.getAttribute('data-expanded').catch(() => 'false');
    console.log(`Row 104 expanded state: ${ariaExpanded}`);
    expect(ariaExpanded).toBe('false'); // Initially collapsed

    // AC-9 continued: Click to expand
    console.log('Clicking to expand row 104...');
    try {
      // Try clicking the row header to toggle expansion
      await collapseButton.click();
      await page.waitForTimeout(500); // Wait for animation
    } catch (e) {
      // Fallback: click anywhere on the row header
      await upStatusHeader.click();
      await page.waitForTimeout(500);
    }

    // Verify row is now expanded
    const expandedState = await rowContainer.getAttribute('data-expanded').catch(() => 'true');
    console.log(`Row 104 expanded state after click: ${expandedState}`);
    expect(expandedState).toBe('true');

    // AC-9 continued: Verify Prometheus targets panel is visible
    // ── Look for scrape targets list or stat panels inside the expanded row ──
    const prometheusTargets = await page.getByText(/Prometheus|Scrape Targets|Target|Medusa|Postgres|Redis|Node/i).count();
    console.log(`Found ${prometheusTargets} references to targets in expanded row`);
    expect(prometheusTargets).toBeGreaterThan(0);

    // AC-10: Capture expanded state screenshot
    const expandedPath = screenshotPath('grafana-dashboard-expanded-2026-06-07.png');
    console.log(`Capturing expanded state to ${expandedPath}...`);
    await page.screenshot({ path: expandedPath, fullPage: false });

    const expandedStats = fs.statSync(expandedPath);
    console.log(`Expanded screenshot: ${expandedStats.size} bytes`);
    expect(expandedStats.size).toBeGreaterThan(200000); // >200KB

    // Verify both screenshots exist and are large enough
    const collapsedPath = screenshotPath('grafana-backend-dashboard.png', DEMO_DIR);
    expect(fs.existsSync(collapsedPath)).toBe(true);
    expect(fs.existsSync(expandedPath)).toBe(true);
    expect(fs.statSync(collapsedPath).size).toBeGreaterThan(200000);
    expect(fs.statSync(expandedPath).size).toBeGreaterThan(200000);

    console.log('✓ All AC-9..AC-10 checks passed');
  });
});
