/**
 * E2E Test Configuration (SSOT — Single Source of Truth)
 *
 * This module centralizes all E2E test configuration:
 * - URLs (backend, storefront)
 * - Authentication credentials (admin)
 * - API keys (publishable key for customer auth)
 * - Feature flags
 *
 * All fixtures (auth.ts, seed.ts) MUST import config from here.
 * Do NOT hardcode URLs or credentials in individual test files.
 *
 * Configuration sources (in priority order):
 * 1. Environment variables (process.env)
 * 2. .env.test file (loaded via dotenv if present)
 * 3. Defaults (local-dev)
 *
 * No secrets (passwords) are hardcoded. For CI/production, provide via env vars.
 */

import path from "node:path";

/**
 * Load .env.test if it exists (for local dev convenience).
 * In CI, rely on env var injection instead.
 */
function loadDotEnvTest() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: `${__dirname}/.env.test` });
  } catch {
    // dotenv not installed or .env.test missing — continue with env vars only
  }
}

loadDotEnvTest();

/**
 * Artifact directories (SSOT — Single Source of Truth)
 * All test artifacts (screenshots, videos, HTML reports) derive from these paths.
 * Resolved relative to repo root via __dirname (portable across machines/CI).
 *
 * Usage:
 * - playwright.config.ts imports these for reporter/screenshot/video output
 * - Test specs import SCREENSHOTS_DIR for individual screenshot saves
 * - Env vars allow CI override (e.g., PLAYWRIGHT_TEST_RESULTS=/tmp/ci-results)
 */
const REPO_ROOT = path.resolve(__dirname, "../..");

export const TEST_RESULTS_DIR =
  process.env.PLAYWRIGHT_TEST_RESULTS ||
  path.join(REPO_ROOT, "tmp/Digital-Commerce/test-results");

export const SCREENSHOTS_DIR =
  process.env.PLAYWRIGHT_SCREENSHOTS ||
  path.join(REPO_ROOT, "tmp/Digital-Commerce/screenshots");

export const HTML_REPORT_DIR =
  process.env.PLAYWRIGHT_HTML_REPORT ||
  path.join(TEST_RESULTS_DIR, "playwright-report");

export const VIDEOS_DIR =
  process.env.PLAYWRIGHT_VIDEOS ||
  path.join(TEST_RESULTS_DIR, "videos");

/**
 * Backend URL (Medusa backend + admin API)
 */
export const BACKEND_URL =
  process.env.BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

/**
 * Storefront URL (buyer-facing React SPA)
 */
export const STOREFRONT_URL =
  process.env.STOREFRONT_URL || "http://localhost:8000";

/**
 * Admin credentials (for fixture setup via API)
 */
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || "admin@test.local";

export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || "Test1234!";

/**
 * Regional test variant (storefront URL path prefix)
 */
export const TEST_REGION_COUNTRY =
  process.env.TEST_REGION_COUNTRY || "nz";

/**
 * Feature flags
 */
export const QUOTE_FEATURE_ENABLED =
  process.env.QUOTE_FEATURE_ENABLED !== "false";

/**
 * Test image base URL (for product images in E2E tests)
 * Used by seedProduct() and other fixtures to configure product image URLs.
 * Default = local Medusa /static path (no remote dependency).
 * Override in CI with a test image bucket URL or custom CDN.
 */
export const TEST_IMAGE_BASE_URL =
  process.env.TEST_IMAGE_BASE_URL || "http://localhost:9000/static";

/**
 * Publishable API key (for customer registration/login)
 * This is resolved at runtime from the backend (see getPublishableKey() below).
 * DO NOT hardcode a production key here.
 */
let cachedPublishableKey: string | null = null;

/**
 * Resolve publishable API key from backend at runtime.
 * This is idempotent — caches the key after the first call.
 *
 * @returns Promise<string> — the publishable API key (pk_...)
 * @throws Error if resolution fails
 */
export async function getPublishableKey(): Promise<string> {
  if (cachedPublishableKey) {
    return cachedPublishableKey;
  }

  // Get admin token first
  const loginRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(
      `config-doctor: Admin login failed (${loginRes.status}) — ` +
        `cannot resolve publishable key. Check ADMIN_EMAIL="${ADMIN_EMAIL}" and backend health.`
    );
  }

  const { token } = (await loginRes.json()) as { token: string };

  // Fetch publishable API key from admin endpoint
  const keyRes = await fetch(`${BACKEND_URL}/admin/api-keys?type=publishable`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!keyRes.ok) {
    throw new Error(
      `config-doctor: Failed to fetch publishable API key (${keyRes.status}). ` +
        `Ensure admin user has permission to read API keys.`
    );
  }

  const { api_keys = [] } = (await keyRes.json()) as { api_keys: Array<{ token: string }> };

  if (api_keys.length === 0) {
    throw new Error(
      `config-doctor: No publishable API keys found on backend. ` +
        `Create one via Admin UI or /admin/api-keys POST endpoint.`
    );
  }

  cachedPublishableKey = api_keys[0].token;
  return cachedPublishableKey;
}

/**
 * Pre-flight health check (config-doctor)
 * Called once per test session to verify all configuration is valid.
 * Fails fast with actionable error messages.
 *
 * Checks:
 * - Backend /health endpoint is reachable
 * - Storefront is reachable
 * - Admin login succeeds with configured credentials
 * - Publishable API key can be resolved
 *
 * @throws Error with clear action steps on any failure
 */
export async function configDoctor() {
  const checks = [
    {
      name: "Backend /health",
      check: async () => {
        const res = await fetch(`${BACKEND_URL}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
      },
      fixHint: `run 'task up' to start the docker-compose stack`,
    },
    {
      name: "Storefront reachable",
      check: async () => {
        const res = await fetch(STOREFRONT_URL, {
          signal: AbortSignal.timeout(30000),
        });
        if (res.status >= 500) {
          throw new Error(`status ${res.status} — server error`);
        }
      },
      fixHint: `check storefront container health: 'docker logs storefront'`,
    },
    {
      name: "Admin login",
      check: async () => {
        const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          throw new Error(
            `status ${res.status} — check ADMIN_EMAIL="${ADMIN_EMAIL}" and ADMIN_PASSWORD`
          );
        }
      },
      fixHint: `verify admin user exists and credentials are correct`,
    },
    {
      name: "Publishable API key",
      check: async () => {
        await getPublishableKey();
      },
      fixHint: `ensure at least one publishable API key exists on the backend`,
    },
  ];

  console.log("\n" + "=".repeat(70));
  console.log("🔍 config-doctor: Pre-flight configuration check");
  console.log("=".repeat(70));

  for (const { name, check, fixHint } of checks) {
    try {
      await check();
      console.log(`✓ ${name}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ BLOCKED: ${name} — ${errMsg}`);
      console.error(`   Fix: ${fixHint}`);
      console.error("\nConfiguration state:");
      console.error(`  BACKEND_URL=${BACKEND_URL}`);
      console.error(`  STOREFRONT_URL=${STOREFRONT_URL}`);
      console.error(`  ADMIN_EMAIL=${ADMIN_EMAIL}`);
      console.error("=".repeat(70) + "\n");
      throw new Error(`config-doctor failed at: ${name}`);
    }
  }

  console.log("\n✓ All checks passed. Configuration is valid.\n");
}

/**
 * Summary: all exports required by fixtures
 */
export const config = {
  BACKEND_URL,
  STOREFRONT_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TEST_REGION_COUNTRY,
  QUOTE_FEATURE_ENABLED,
  TEST_IMAGE_BASE_URL,
  TEST_RESULTS_DIR,
  SCREENSHOTS_DIR,
  HTML_REPORT_DIR,
  VIDEOS_DIR,
  getPublishableKey,
  configDoctor,
};

export default config;
