import { chromium } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { configDoctor } from "./config";

const SEED_LOG_PATH = path.resolve(
  __dirname,
  "../../tmp/B2B-Commerce/test-results/seed-demo-b2b.log"
);

/**
 * Wire the medusa-exec seed (A0-US-2).
 * Runs: docker exec ec_backend npx medusa exec ./src/scripts/seed-demo-b2b.ts
 * Idempotent — seed checks-then-creates at every step, safe to run multiple times.
 * Captures stdout+stderr to SEED_LOG_PATH for evidence.
 * Fails fast (throws) if the container command exits non-zero.
 */
async function runB2BSeed() {
  // Use node_modules/.bin/medusa with -w (workdir) to set cwd to /server/apps/backend
  // where package.json + medusa config live. npx is not wired in the container PATH.
  const cmd = "docker exec -w /server/apps/backend ec_backend node_modules/.bin/medusa exec ./src/scripts/seed-demo-b2b.ts";
  console.log(`\n[global-setup] Running B2B seed via: ${cmd}`);

  let output = "";
  let success = false;
  try {
    output = execSync(cmd, {
      timeout: 120_000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    success = true;
    console.log("[global-setup] ✓ B2B seed completed");
  } catch (err: unknown) {
    const execError = err as { stdout?: string; stderr?: string; message?: string };
    output = [execError.stdout, execError.stderr, execError.message]
      .filter(Boolean)
      .join("\n");
    console.error("[global-setup] ✗ B2B seed FAILED (see log for details)");
    console.error(output);
  }

  // Write evidence log regardless of outcome
  fs.mkdirSync(path.dirname(SEED_LOG_PATH), { recursive: true });
  fs.writeFileSync(SEED_LOG_PATH, output, "utf-8");
  console.log(`[global-setup] Seed log written to: ${SEED_LOG_PATH}`);

  if (!success) {
    throw new Error(
      `[global-setup] B2B seed failed — check ${SEED_LOG_PATH} for details`
    );
  }
}

/**
 * Global setup: config-doctor + B2B seed + health checks before running tests.
 * config-doctor verifies all E2E configuration is valid.
 * B2B seed populates Demo Corp + PENDING approval so approval spec can hard-assert.
 * If any check fails, exit with clear messaging.
 */
async function globalSetup() {
  try {
    // Step 1: Run config-doctor (SSOT configuration validation)
    await configDoctor();

    // Step 2: Run the B2B demo seed (A0-US-2)
    // Uses apps/backend/src/scripts/seed-demo-b2b.ts via medusa exec.
    // NOT the stale REST seeds (tests/fixtures/seed-demo-b2b.ts, tests/e2e/fixtures/seed.ts).
    await runB2BSeed();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Global setup failed: ${errMsg}`);
    console.error("Cannot proceed with test execution until configuration is fixed.\n");
    process.exit(1);
  }
}

export default globalSetup;
