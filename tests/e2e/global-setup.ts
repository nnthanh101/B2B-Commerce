import { chromium } from "@playwright/test";

/**
 * Global setup: verify backend is healthy before running tests.
 * If backend is unreachable, skip all tests with clear messaging.
 */
async function globalSetup() {
  const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
  const MAX_RETRIES = 6;
  const RETRY_DELAY_MS = 2000;

  let healthy = false;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`${MEDUSA_BACKEND_URL}/health`, {
        timeout: 5000,
      });
      if (response.ok) {
        healthy = true;
        console.log(`✓ Backend health check passed: ${MEDUSA_BACKEND_URL}`);
        break;
      }
    } catch (err) {
      console.log(
        `✗ Backend health check attempt ${i + 1}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS}ms...`
      );
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  if (!healthy) {
    console.error(
      `\n❌ BLOCKED: Backend is not running at ${MEDUSA_BACKEND_URL}`
    );
    console.error(
      "Please run 'task up' to start the docker-compose stack first.\n"
    );
    process.exit(1);
  }
}

export default globalSetup;
