import { defineConfig, devices } from "@playwright/test";

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const TEST_REGION_COUNTRY = process.env.TEST_REGION_COUNTRY || "dk";

/**
 * Global setup: ping backend /health endpoint to gate test execution.
 * If backend is not running, tests are skipped with clear messaging.
 */
const globalSetup = require.resolve("./tests/e2e/global-setup.ts");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder:
          process.env.PLAYWRIGHT_HTML_REPORT ||
          "../../tmp/Digital-Commerce/test-results/playwright-report",
      },
    ],
  ],

  use: {
    baseURL: STOREFRONT_URL,
    trace: "retain-on-failure",
    screenshot: {
      mode: "only-on-failure",
      dir:
        process.env.PLAYWRIGHT_SCREENSHOTS ||
        "../../tmp/Digital-Commerce/screenshots",
    },
    video: "retain-on-failure",
  },

  webServer: undefined, // docker-compose stack runs independently; no spawning here

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup,

  globalTeardown: require.resolve("./tests/e2e/global-teardown.ts"),
});
