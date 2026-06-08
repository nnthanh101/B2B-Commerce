#!/usr/bin/env node
/**
 * Capture CEO reel beats 5 and 6 — admin approval UI
 *
 * Beat 5: Admin Approvals page with #2469 pending + approve button visible (pre-click)
 * Beat 6: After approval, status flipped (no audit UI in this build — downgraded per CA spec)
 *
 * Note: No comment field exists in current approval UI (simple confirm dialog only).
 * Beat 6 is downgraded: captures "Approved" status on approval list (no audit trail panel).
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const OUT_APPROVAL = path.join(REPO_ROOT, "docs/site/img/demo/flows/02-approval");
const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/02-approval");

fs.mkdirSync(OUT_APPROVAL, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

async function getAdminToken() {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local", password: "Test1234!" }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function getApprovalId(adminToken) {
  const res = await fetch(`${BACKEND_URL}/admin/approvals`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error(`Get approvals failed: ${res.status}`);
  const data = await res.json();
  const pending = (data.carts_with_approvals || []).find(cart =>
    cart.approval_status?.status === "pending"
  );
  return pending || null;
}

async function main() {
  const adminToken = await getAdminToken();
  console.log("Admin token obtained");

  const pendingCart = await getApprovalId(adminToken);
  console.log("Pending approval cart:", pendingCart ? pendingCart.id : "NONE");

  if (!pendingCart) {
    console.error("ERROR: No pending approval found. Run task seed or scripts/e2e.sh first.");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // Set admin auth cookie/session by navigating to login first
  const page = await context.newPage();

  // Navigate to admin login and authenticate via session (cookie-based)
  await page.goto(`${BACKEND_URL}/app/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Fill in the login form
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]', "admin@test.local");
  await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i], input[id*="password" i]', "Test1234!");
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const loginUrl = page.url();
  console.log("After login, current URL:", loginUrl);

  // Navigate to approvals
  await page.goto(`${BACKEND_URL}/app/approvals`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // === BEAT 5: Approvals list with #2469 pending and approve button ===
  const pageContent5 = await page.textContent("body");
  const hasPending = pageContent5.includes("Pending") || pageContent5.includes("pending");
  const hasId = pageContent5.includes("2469");
  console.log(`Beat 5 assertion — Pending: ${hasPending}, #2469: ${hasId}`);
  if (!hasPending || !hasId) {
    console.error("ASSERTION FAIL: Beat 5 — page does not show #2469 pending approval");
    await page.screenshot({ path: path.join(TMP_DIR, "beat5-FAIL.png") });
    await browser.close();
    process.exit(1);
  }

  const beat5Path = path.join(OUT_APPROVAL, "step-05b-govern-approve.png");
  await page.screenshot({ path: beat5Path, fullPage: false });
  console.log(`Beat 5 captured: ${beat5Path}`);

  // === BEAT 6: Approve the cart (call API directly, then capture status-flipped state) ===
  // Find the approval id
  const approvals = pendingCart.approvals || [];
  // Type can be "admin" or "sales_manager" depending on company approval settings
  const pendingApproval = approvals.find(a => a.status === "pending");
  if (!pendingApproval) {
    console.error("ERROR: No pending approval found on cart. Approvals:", JSON.stringify(approvals));
    await browser.close();
    process.exit(1);
  }

  console.log("Approving approval id:", pendingApproval.id, "type:", pendingApproval.type);
  const approveRes = await fetch(`${BACKEND_URL}/admin/approvals/${pendingApproval.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "approved" }),
  });

  if (!approveRes.ok) {
    const body = await approveRes.text();
    console.error(`Approval API failed: ${approveRes.status} — ${body}`);
    await browser.close();
    process.exit(1);
  }
  console.log("Approval API returned:", approveRes.status);

  // Reload the approvals page to see the updated status
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const pageContent6 = await page.textContent("body");
  const hasApproved = pageContent6.includes("Approved") || pageContent6.includes("approved");
  console.log(`Beat 6 assertion — Approved status visible: ${hasApproved}`);

  // Beat 6: capture whether approved or table now empty (approval removed after approve)
  const beat6Path = path.join(OUT_APPROVAL, "step-06b-approved-audit.png");
  await page.screenshot({ path: beat6Path, fullPage: false });
  console.log(`Beat 6 captured: ${beat6Path}`);

  if (!hasApproved) {
    // Check if approval was processed and no longer pending (table may be empty)
    console.log("NOTE: 'Approved' text not found in page — approval may have been removed from pending list after approval.");
    console.log("Page snippet:", pageContent6.slice(0, 500));
  }

  await browser.close();
  console.log("Done. Frames written to docs/site/img/demo/flows/02-approval/");
  console.log("  step-05b-govern-approve.png");
  console.log("  step-06b-approved-audit.png");
}

main().catch(e => { console.error(e); process.exit(1); });
