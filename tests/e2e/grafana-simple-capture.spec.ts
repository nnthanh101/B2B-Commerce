import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Simplified Grafana dashboard screenshot capture
 * Run: node node_modules/@playwright/test/cli.js test tests/e2e/grafana-simple-capture.spec.ts --project=chromium
 */

const GRAFANA_URL = 'http://host.docker.internal:3000' || process.env.GRAFANA_URL || 'http://localhost:3000';
const DASHBOARD_SLUG = 'commerce-backend';
const DEMO_DIR = path.resolve(__dirname, '../../tmp/Digital-Commerce/demo');
const REPORT_DIR = path.resolve(__dirname, '../../tmp/Digital-Commerce/test-results');

test('Capture Grafana dashboard at 1280x720', async ({ page }) => {
  // Set viewport to exact spec
  await page.setViewportSize({ width: 1280, height: 720 });

  console.log(`Navigating to ${GRAFANA_URL}/d/${DASHBOARD_SLUG}...`);

  try {
    await page.goto(`${GRAFANA_URL}/d/${DASHBOARD_SLUG}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  } catch (e) {
    console.error('Navigation failed, trying localhost:', e);
    await page.goto(`http://localhost:3000/d/${DASHBOARD_SLUG}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  }

  // Wait for content to render
  await page.waitForTimeout(2000);

  // Log page title
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Capture full viewport at 1280x720
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const screenshotPath = path.join(DEMO_DIR, 'grafana-backend-dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const stats = fs.statSync(screenshotPath);
  console.log(`Screenshot saved: ${screenshotPath} (${stats.size} bytes)`);
});
