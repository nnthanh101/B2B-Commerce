#!/usr/bin/env node
/**
 * Standalone SSO Test Runner — runs the SSO proof Playwright test
 * Usage: node scripts/sso-test-runner.mjs
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// Run: npx playwright test tests/e2e/sso-proof.spec.ts
const child = spawn("npx", [
  "playwright",
  "test",
  "tests/e2e/sso-proof.spec.ts",
  "--reporter=list,html",
  "--headed=false",
], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
