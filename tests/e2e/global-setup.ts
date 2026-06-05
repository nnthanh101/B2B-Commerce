import { chromium } from "@playwright/test";
import { configDoctor } from "./config";

/**
 * Global setup: config-doctor + health checks before running tests.
 * config-doctor verifies all E2E configuration is valid.
 * If any check fails, exit with clear messaging.
 */
async function globalSetup() {
  try {
    // Run config-doctor (SSOT configuration validation)
    await configDoctor();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Global setup failed: ${errMsg}`);
    console.error("Cannot proceed with test execution until configuration is fixed.\n");
    process.exit(1);
  }
}

export default globalSetup;
