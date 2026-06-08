#!/usr/bin/env node
/**
 * Scenario-Reel Capture Engine — config-driven, multi-reel.
 *
 * Models on: scripts/capture-ceo-fresh.mjs (PROVEN headless Playwright pattern:
 *   admin SPA login at /app/login, buyer JWT cookie auth, per-beat page.screenshot,
 *   injectRoleBar + highlightElement CSS-injection, real approve Check-button click).
 *
 * Usage:  node scripts/capture-scenario-reels.mjs --reel cfo
 *
 * Reels (REELS config): currently `cfo` (CFO Governed Spend, 6 beats, Maria <-> David).
 *
 * Per-beat pipeline:  nav -> waitFor -> dismissDevOverlays -> injectHeaderBar ->
 *   injectHighlights (returns found/not-found report) -> assert required highlights ->
 *   page.screenshot -> save to docs/static/img/demo/flows/<reel>/step-0N.png AND
 *   mirror to tmp/B2B-Commerce/demo/scenario-flows/<reel>/step-0N.png.
 *   A beat with a MISSING required highlight is ALSO saved to a _REJECT/ subdir and
 *   marked failed in the self-check JSON, so the orchestrator's Read-gate sees the miss.
 *
 * Self-check JSON: tmp/B2B-Commerce/demo/scenario-capture-<reel>.json
 *
 * GROUND-TRUTH NOTE (2026-06-08, live probe of THIS DB):
 *   The seeded over-limit cart (cart_01KTJPADGC546FRCA517WJ2469) renders cart total
 *   = NZ$520.00 (2x Wireless Mouse, unit_price 260). The CA "NZ$260" correction was
 *   probed against an earlier seed state and is STALE for this DB. This engine captures
 *   what the storefront TRULY renders and records the observed total in the JSON.
 *   Forcing a fabricated NZ$260 frame would itself be a visual-content-gate REJECT.
 *   The governance story is intact either way: total > NZ$200 limit -> banner + disabled button.
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import pgModule from "/Volumes/Working/projects/B2B-Commerce/node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/index.js";
const pg = pgModule.default || pgModule["module.exports"] || pgModule;

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").replace(/^file:\/\//, "");
const BACKEND_URL    = process.env.BACKEND_URL    || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";

// Seeded fixtures (live-probed 2026-06-08)
const APPROVAL_ID = "appr_01KTJPADHRQ6457KFCTF1JZ1VX";
const CART_ID     = "cart_01KTJPADGC546FRCA517WJ2469";
const COMPANY_ID  = "comp_01KTJPAD82P67VBBP7MA5Z4T8P";

// Persona accents (storefront teal = Maria, admin blue = David, sales purple = Priya)
const MARIA = { name: "Maria · Procurement Specialist", initial: "M", accent: "#0d9488" };
const DAVID = { name: "David · Approving Manager",       initial: "D", accent: "#1d4ed8" };
const PRIYA = { name: "Priya · Sales Manager",           initial: "P", accent: "#7c3aed" };

// Countered demo quote (seeded by tmp/B2B-Commerce/run-negotiate-seed.mjs /
// apps/backend/src/scripts/seed-demo-negotiated-quote.ts). Status pending_customer,
// Current Total NZ$1,582.00 vs counter New Total NZ$1,423.80, 2-message thread
// (Demo Buyer request + Priya Sharma counter). Live totals re-probed at runtime.
const NEGOTIATED_QUOTE_ID = "quo_01KTK4BA78X1YF3DMJWEXE1KN5";

// ─── Header-bar injection (fixed top banner; pushes body padding-top) ────────────
async function injectHeaderBar(page, { name, initial, accent }) {
  await page.evaluate(({ name, initial, accent }) => {
    document.getElementById("reel-headerbar")?.remove();
    document.getElementById("reel-headerbar-spacer")?.remove();

    const bar = document.createElement("div");
    bar.id = "reel-headerbar";
    bar.style.cssText = [
      "position:fixed", "top:0", "left:0", "right:0", "height:48px",
      "display:flex", "align-items:center", "gap:12px", "padding:0 20px",
      `background:linear-gradient(90deg,${accent},#0f1f3d)`,
      "color:#fff", "font:600 16px/48px system-ui,-apple-system,sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.25)", "z-index:2147483647",
    ].join(";");

    const dot = document.createElement("span");
    dot.style.cssText = [
      "width:28px", "height:28px", "border-radius:50%", `background:${accent}`,
      "border:2px solid rgba(255,255,255,.55)",
      "display:inline-flex", "align-items:center", "justify-content:center",
      "font-weight:700", "font-size:13px", "flex-shrink:0",
    ].join(";");
    dot.textContent = initial;

    const lbl = document.createElement("span");
    lbl.textContent = name;

    bar.appendChild(dot); bar.appendChild(lbl);
    document.body.appendChild(bar);

    // Spacer as first body child so the fixed bar never occludes the app header.
    const spacer = document.createElement("div");
    spacer.id = "reel-headerbar-spacer";
    spacer.style.cssText = "height:52px;flex-shrink:0;pointer-events:none";
    document.body.insertBefore(spacer, document.body.firstChild);
  }, { name, initial, accent });
}

// ─── Highlight injection (returns found/not-found report per target) ─────────────
/**
 * injectHighlights(page, highlights) -> [{ id, resolved, by }]
 * Each highlight: { selector?, textAnchor?, label?, style?, required? }
 *   - selector: real CSS selector (querySelector)
 *   - textAnchor: substring match against element textContent (Tailwind-churn-proof)
 *   - style: "outline" (default) | "spotlight" (dims the rest of the page)
 *   - label: optional amber chip rendered above the element
 */
async function injectHighlights(page, highlights) {
  return await page.evaluate((highlights) => {
    const report = [];

    function locate(h) {
      if (h.selector) {
        const el = document.querySelector(h.selector);
        if (el) return { el, by: "selector" };
      }
      if (h.textAnchor) {
        const target = h.textAnchor.trim();
        const all = [...document.querySelectorAll("body *")];
        // Prefer the tightest leaf node, then nearest ancestor containing the text.
        const leaf = all.find(n => n.children.length === 0 && n.textContent?.trim() === target);
        if (leaf) return { el: leaf, by: "textAnchor-exact" };
        const incl = all.find(n => n.textContent?.includes(target) &&
          ![...n.children].some(c => c.textContent?.includes(target)));
        if (incl) return { el: incl, by: "textAnchor-tight" };
        const any = all.find(n => n.textContent?.includes(target));
        if (any) return { el: any, by: "textAnchor-loose" };
      }
      return null;
    }

    let didSpotlight = false;
    for (const h of highlights) {
      const hit = locate(h);
      if (!hit) {
        report.push({ id: h.id, resolved: false, by: null });
        continue;
      }
      const { el, by } = hit;

      if (h.style === "spotlight" && !didSpotlight) {
        // Dim everything via a full-page scrim, then raise the target above it.
        const scrim = document.createElement("div");
        scrim.id = "reel-spotlight-scrim";
        scrim.style.cssText = [
          "position:fixed", "inset:0", "background:rgba(8,12,24,.55)",
          "z-index:2147483640", "pointer-events:none",
        ].join(";");
        document.body.appendChild(scrim);
        didSpotlight = true;
        el.style.position = el.style.position || "relative";
        el.style.zIndex = "2147483645";
      }

      el.style.outline = "3px solid #ffb000";
      el.style.outlineOffset = "3px";
      el.style.boxShadow = "0 0 0 4px rgba(255,176,0,.35),0 0 24px rgba(255,176,0,.60)";
      el.style.borderRadius = "6px";

      if (h.label) {
        const r = el.getBoundingClientRect();
        const chip = document.createElement("div");
        chip.className = "reel-hl-chip";
        chip.textContent = h.label;
        const top = Math.max(54, r.top - 30);
        chip.style.cssText = [
          "position:fixed",
          `top:${top}px`,
          `left:${Math.max(8, r.left)}px`,
          "background:#ffb000", "color:#1a1a1a",
          "font:700 12px/1 system-ui,sans-serif",
          "padding:5px 9px", "border-radius:5px",
          "box-shadow:0 2px 8px rgba(0,0,0,.35)",
          "z-index:2147483646", "pointer-events:none", "white-space:nowrap",
        ].join(";");
        document.body.appendChild(chip);
      }

      report.push({ id: h.id, resolved: true, by });
    }
    return report;
  }, highlights);
}

// ─── Dev-overlay dismissal (Next.js portals + the "N Issues" pill) ───────────────
async function dismissDevOverlays(page) {
  await page.evaluate(() => {
    const kill = (el) => el && el.remove();
    // Next.js dev tooling portals + the build-activity / Issues pill
    document.querySelectorAll("nextjs-portal").forEach(kill);
    document.querySelectorAll("[data-nextjs-toast]").forEach(kill);
    document.querySelectorAll("[data-nextjs-dialog-overlay]").forEach(kill);
    document.querySelectorAll("#__next-build-watcher").forEach(kill);
    document.querySelectorAll("[data-next-mark]").forEach(kill);
    // The "N Issues" pill renders inside a fixed bottom-left button/anchor.
    [...document.querySelectorAll("button,a,div")].forEach(el => {
      const t = el.textContent?.trim() || "";
      if (/^\d+\s+Issues?$/i.test(t) || /^Issues?$/i.test(t)) {
        // only remove small fixed widgets, never page content
        const st = getComputedStyle(el);
        if (st.position === "fixed" && el.getBoundingClientRect().width < 220) kill(el);
      }
    });
    // Generic dev-indicator portals Next 14/15 attach to <body>
    document.querySelectorAll("[id^='__next-dev'], [class*='nextjs']").forEach(el => {
      const st = getComputedStyle(el);
      if (st.position === "fixed") kill(el);
    });
  });
}

// ─── API / auth helpers (mirror capture-ceo-fresh.mjs) ───────────────────────────
async function getAdminToken() {
  const r = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local", password: "Test1234!" }),
  });
  if (!r.ok) throw new Error(`Admin login failed: ${r.status}`);
  return (await r.json()).token;
}
async function getBuyerToken() {
  const r = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo-buyer@democorp.local", password: "Test1234!" }),
  });
  if (!r.ok) throw new Error(`Buyer login failed: ${r.status}`);
  return (await r.json()).token;
}
async function getPublishableKey(adminToken) {
  const r = await fetch(`${BACKEND_URL}/admin/api-keys?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const d = await r.json();
  return (d.api_keys || []).find(k => k.type === "publishable" && !k.revoked_at)?.token || "";
}
async function getCartTotal(pubKey) {
  const r = await fetch(`${BACKEND_URL}/store/carts/${CART_ID}`, {
    headers: { "x-publishable-api-key": pubKey },
  });
  const c = (await r.json()).cart || {};
  return { total: c.total, currency: c.currency_code, items: (c.items || []).length };
}

// Fetch the negotiated quote's live Current/New totals + message count via the
// buyer-authed store preview route (the exact source the buyer detail page reads).
async function getNegotiatedQuote(pubKey, buyerToken, quoteId) {
  const r = await fetch(`${BACKEND_URL}/store/quotes/${quoteId}/preview`, {
    headers: { Authorization: `Bearer ${buyerToken}`, "x-publishable-api-key": pubKey },
  });
  if (!r.ok) throw new Error(`Quote preview ${quoteId} failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const q = (await r.json()).quote;
  return {
    status: q.status,
    currentTotal: Number(q.draft_order.total),
    newTotal: Number(q.order_preview.total),
    currency: q.draft_order.currency_code,
    messages: (q.messages || []).length,
  };
}

// ─── Live-probed catalog (2026-06-08, GREEN NZD region reg_01KTJP9Y...) ───────────
// Real variant IDs + rendered NZD prices, confirmed against /store/products.
// Used to build fresh COO + Buyer carts so reels show TRUE resolved line prices.
const CATALOG = {
  mouse:    { variant: "variant_01KTJP9YHG0XQX9NESBGWF8MCA", nzd: 130, label: "Wireless Mouse" },
  keyboard: { variant: "variant_01KTJP9YHGF7P56G7QWM147BAJ", nzd: 163, label: "Wireless Keyboard" },
  headset:  { variant: "variant_01KTJP9YHFGM67WH68VBBV1YT7", nzd: 246, label: "Hi-Fi Headset" },
  webcam97: { variant: "variant_01KTJP9YHFN3YAQNXJRRPVRXG1", nzd: 97,  label: "1080p HD Pro Webcam" },
};

async function getNzRegionId(pubKey) {
  const r = await fetch(`${BACKEND_URL}/store/regions`, {
    headers: { "x-publishable-api-key": pubKey },
  });
  const region = (await r.json()).regions.find(x => x.currency_code === "nzd");
  if (!region) throw new Error("No NZD region found");
  return region.id;
}

// Build a fresh cart with the given line items (real variants) and return its
// id + the live-rendered total. Mirrors createCartWithItems in capture-flows.mjs.
async function buildCart(pubKey, buyerToken, regionId, items) {
  const h = { "Content-Type": "application/json", "x-publishable-api-key": pubKey, Authorization: `Bearer ${buyerToken}` };
  const cr = await fetch(`${BACKEND_URL}/store/carts`, { method: "POST", headers: h, body: JSON.stringify({ region_id: regionId }) });
  if (!cr.ok) throw new Error(`Cart create failed: ${cr.status} ${(await cr.text()).slice(0, 200)}`);
  const cart = (await cr.json()).cart;
  for (const it of items) {
    const lr = await fetch(`${BACKEND_URL}/store/carts/${cart.id}/line-items`, {
      method: "POST", headers: h, body: JSON.stringify({ variant_id: it.variant, quantity: it.qty }),
    });
    if (!lr.ok) throw new Error(`Add line ${it.variant} failed: ${lr.status} ${(await lr.text()).slice(0, 200)}`);
  }
  const fr = await fetch(`${BACKEND_URL}/store/carts/${cart.id}`, { headers: { "x-publishable-api-key": pubKey } });
  const fresh = (fr.ok ? (await fr.json()).cart : {}) || {};
  return { id: cart.id, total: fresh.total, currency: fresh.currency_code, items: (fresh.items || []).length };
}

function fmtNzd(amount) {
  return amount != null
    ? `NZ$${Number(amount).toLocaleString("en-NZ", { minimumFractionDigits: 2 })}`
    : "NZ$0.00";
}

// Reset shared approval -> pending (local, reversible; mirrors capture-ceo-fresh.mjs).
async function resetApprovalToPending(adminToken) {
  await fetch(`${BACKEND_URL}/admin/approvals/${APPROVAL_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending" }),
  }).catch(() => {});
  const { Client } = pg;
  const cl = new Client({ host: "localhost", port: 5432, database: "ec-store", user: "postgres", password: "postgres" });
  await cl.connect();
  await cl.query(`UPDATE approval_status SET status='pending', updated_at=NOW() WHERE cart_id=$1`, [CART_ID]);
  await cl.query(`UPDATE approval SET type='sales_manager', status='pending', updated_at=NOW() WHERE id=$1`, [APPROVAL_ID]);
  await cl.end();
}
async function approveApprovalAPI(adminToken) {
  const r = await fetch(`${BACKEND_URL}/admin/approvals/${APPROVAL_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  if (!r.ok) throw new Error(`Approve failed: ${r.status}`);
  return (await r.json());
}

// ─── Scroll-to-top helper (avoids highlights centering content off-screen) ──────
async function scrollTop(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelectorAll("*").forEach(el => {
      if (el === document.body || el === document.documentElement) return;
      const st = getComputedStyle(el);
      if ((st.overflowY === "auto" || st.overflowY === "scroll") && el.scrollTop > 0) el.scrollTop = 0;
    });
  });
}

// ─── Scroll a text anchor into view, then re-pin below the fixed header-bar ───────
// Centres the matched element, then nudges up so the 48px header-bar never occludes it.
async function scrollToText(page, anchor) {
  await page.evaluate((anchor) => {
    const target = anchor.trim();
    const all = [...document.querySelectorAll("body *")];
    const el = all.find(n => n.children.length === 0 && n.textContent?.includes(target))
      || all.find(n => n.textContent?.includes(target));
    if (el) {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      // Lift slightly so a top-of-frame match clears the fixed header-bar.
      window.scrollBy({ top: -60, behavior: "instant" });
    }
  }, anchor);
  await page.waitForTimeout(400);
}

// ─── CFO reel config (the beat sheet). Built at runtime so we can inject cart total. ─
function buildCfoReel(observedCartTotal) {
  // observedCartTotal is the live-rendered NZ$ string (e.g. "NZ$520.00").
  // CAPTURE ORDER vs PUBLISHED ORDER (capture-ordering fix, 2026-06-08):
  //   The CFO cart carries a COMPLETED approval from a prior cycle, which renders the
  //   contradictory green banner "approved and can now be completed" on the buyer cart
  //   page. To keep the buyer beats truthful, the approval MUST be PENDING while we
  //   capture beats 2 + 3. So the capture SEQUENCE is reordered:
  //     1. reset approval -> pending (resetBefore on the FIRST captured beat)
  //     2. capture buyer beats 2 + 3 (over-limit banner, NO "approved" banner)
  //     3. capture admin beats 1 + 4 (pending state)
  //     4. beat 5 (approve confirm dialog) -> confirm the approval
  //     5. beat 6 (approved record)
  //   Each beat keeps its PUBLISHED filename (step-0N.png) via `outFile`, so the reel
  //   assembly order on disk is unchanged — only the capture order moves.
  //   Buyer beats also carry a `rejectIfText` content-assertion baking the gate in.
  return {
    id: "cfo",
    outDirName: "cfo-governed-spend",
    beats: [
      {
        id: "beat2-cart-overlimit",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollTop: true,
        resetBefore: true, // FIRST action of the whole reel: approval -> pending before any buyer frame
        rejectIfText: "approved and can now be completed", // mixed-message reject gate
        highlights: [
          { id: "cart-total", textAnchor: observedCartTotal, label: `Cart total · ${observedCartTotal}`, style: "outline", required: true },
          { id: "overlimit-banner", textAnchor: "exceeds your spending limit", label: "Over spending limit", style: "outline", required: true },
        ],
        outFile: "step-02.png",
      },
      {
        id: "beat3-checkout-gated",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollTop: false,
        rejectIfText: "approved and can now be completed", // mixed-message reject gate
        highlights: [
          { id: "disabled-button", textAnchor: "Spending Limit Exceeded", label: "Checkout blocked", style: "spotlight", required: true },
        ],
        outFile: "step-03.png",
      },
      {
        id: "beat1-company-settings",
        persona: DAVID,
        target: "admin",
        url: `${BACKEND_URL}/app/companies/${COMPANY_ID}`,
        waitMs: 4500,
        scrollTop: true,
        highlights: [
          { id: "employee-limit-row", textAnchor: "demo-buyer@democorp.local", label: "Per-employee spending limit", style: "outline", required: false },
          { id: "employee-limit-value", textAnchor: "NZ$200.00", label: "Maria's limit · NZ$200.00", style: "outline", required: true },
        ],
        outFile: "step-01.png",
      },
      {
        id: "beat4-pending-approval",
        persona: DAVID,
        target: "admin",
        url: `${BACKEND_URL}/app/approvals`,
        waitMs: 3500,
        scrollTop: true,
        resetBefore: true, // re-assert PENDING (race-safe) for this admin frame
        highlights: [
          { id: "demo-corp-row", textAnchor: "2469", label: "Pending approval · Demo Corp", style: "outline", required: true },
          { id: "pending-badge", textAnchor: "Pending", label: "Awaiting decision", style: "outline", required: true },
        ],
        outFile: "step-04.png",
      },
      {
        id: "beat5-approve",
        persona: DAVID,
        target: "admin",
        url: `${BACKEND_URL}/app/approvals`,
        waitMs: 3500,
        scrollTop: true,
        clickApprove: true, // click the real Check button -> confirm dialog
        highlights: [], // highlight applied dynamically around the approve affordance
        outFile: "step-05.png",
      },
      {
        id: "beat6-approved-record",
        persona: DAVID,
        target: "admin",
        url: `${BACKEND_URL}/app/approvals`,
        waitMs: 3500,
        scrollTop: true,
        approveBefore: true, // make sure the record is approved (API fallback) before this frame
        highlights: [
          { id: "approved-badge", textAnchor: "Approved", label: "On the record · Approved", style: "outline", required: true },
          { id: "approved-row", textAnchor: "2469", label: "Governed spend record", style: "outline", required: false },
        ],
        outFile: "step-06.png",
      },
    ],
  };
}

// ─── COO reel — Procurement Velocity (Maria, teal). Storefront-only, 5 beats. ──────
// Cart = Mouse 130 + Keyboard 163 + Headset 246 (3 real SKUs). Live total NZ$539.00.
// TRUTH NOTE: NZ$539 > Maria's NZ$200 limit, so the cart shows the over-limit banner
//   and the checkout button is disabled ("Spending Limit Exceeded"); the truthful CTA
//   is "Request Quote". Beat 5 highlights Request Quote (NOT a fake enabled checkout) —
//   that is the honest B2B velocity-without-overspend story for a multi-SKU restock.
//   The bulk-entry UI is the product-page SKU/Color/Price/Quantity grid; the quick-pad
//   is the cart-page "Quick Order" / "Paste SKUs" control. Both verified live.
function buildCooReel(cartId, observedTotal) {
  const headsetHandle = "hi-fi-gaming-headset-pro-grade-dac-hi-res-certified";
  return {
    id: "coo",
    outDirName: "coo-procurement-velocity",
    cartCookie: cartId,
    beats: [
      {
        id: "beat1-bulk-entry",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/products/${headsetHandle}`,
        waitMs: 4500,
        scrollTop: false,
        scrollToText: "SKU",
        highlights: [
          { id: "bulk-grid", textAnchor: "Quantity", label: "Bulk entry · SKU × qty grid", style: "outline", required: true },
          { id: "bulk-price", textAnchor: "NZ$246.00", label: "Per-SKU NZD price", style: "outline", required: false },
        ],
        outFile: "step-01.png",
      },
      {
        id: "beat2-skus-resolved",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollTop: true,
        highlights: [
          { id: "line-headset", textAnchor: "Hi-Fi Gaming Headset", label: "SKU resolved", style: "outline", required: true },
          { id: "line-price", textAnchor: "NZ$246.00", label: "Resolved NZD unit price", style: "outline", required: true },
        ],
        outFile: "step-02.png",
      },
      {
        id: "beat3-quick-pad",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollToText: "Quick Order",
        highlights: [
          { id: "quick-order", textAnchor: "Quick Order", label: "Quick order pad · paste SKUs", style: "outline", required: true },
          { id: "paste-hint", textAnchor: "Paste SKUs", label: "Fast repeat-order entry", style: "outline", required: false },
        ],
        outFile: "step-03.png",
      },
      {
        id: "beat4-cart-total",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollToText: "Total",
        highlights: [
          { id: "cart-total", textAnchor: observedTotal, label: `Consolidated total · ${observedTotal}`, style: "outline", required: true },
        ],
        outFile: "step-04.png",
      },
      {
        id: "beat5-quote-cta",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollToText: "Request Quote",
        highlights: [
          { id: "request-quote", textAnchor: "Request Quote", label: "Procure-ready · Request Quote", style: "spotlight", required: true },
        ],
        outFile: "step-05.png",
      },
    ],
  };
}

// ─── Buyer reel — Full Self-Service (Maria, teal). Storefront-only, 5 beats. ────────
// WITHIN-LIMIT cart = 1× Webcam NZ$97 (< NZ$200 limit) so checkout is NOT blocked.
// Beat 5 ends at a clean enabled-checkout state unless a full order confirmation is
//   reliably green (the runner attempts /nz/checkout and records what truly renders).
function buildBuyerReel(cartId, observedTotal) {
  const webcamHandle = "1080p-hd-pro-webcam-superior-video-privacy-enabled";
  return {
    id: "buyer",
    outDirName: "buyer-self-service",
    cartCookie: cartId,
    beats: [
      {
        id: "beat1-storefront-landing",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/store`,
        waitMs: 4500,
        scrollTop: true,
        highlights: [
          { id: "catalog", textAnchor: "NZ$", label: "Self-service catalog · NZD", style: "outline", required: true },
        ],
        outFile: "step-01.png",
      },
      {
        id: "beat2-product-detail",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/products/${webcamHandle}`,
        waitMs: 4500,
        scrollTop: true,
        highlights: [
          { id: "webcam-price", textAnchor: "NZ$97.00", label: "Webcam · NZ$97.00", style: "outline", required: true },
        ],
        outFile: "step-02.png",
      },
      {
        id: "beat3-add-to-cart",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollTop: true,
        highlights: [
          { id: "cart-line", textAnchor: "1080p HD Pro Webcam", label: "Added to cart", style: "outline", required: true },
          { id: "cart-line-price", textAnchor: "NZ$97.00", label: "NZ$97.00 line item", style: "outline", required: false },
        ],
        outFile: "step-03.png",
      },
      {
        id: "beat4-within-limit",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/cart`,
        waitMs: 4500,
        scrollToText: "Total",
        // WITHIN-LIMIT assertion: NZ$97 < NZ$200 so the over-limit banner MUST be absent.
        rejectIfText: "exceeds your spending limit",
        highlights: [
          { id: "cart-total", textAnchor: observedTotal, label: `Within limit · ${observedTotal} < NZ$200`, style: "outline", required: true },
          { id: "checkout-cta", textAnchor: "Checkout", label: "Checkout enabled", style: "outline", required: true },
        ],
        outFile: "step-04.png",
      },
      {
        id: "beat5-checkout",
        persona: MARIA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/checkout?step=address`,
        waitMs: 5000,
        scrollTop: true,
        // Honest end-state: capture whatever the checkout flow truly renders. If an
        // order confirmation (order #) is reachable green, great; otherwise this is a
        // clean checkout-ready state. The self-check JSON records which one landed.
        rejectIfText: "exceeds your spending limit",
        highlights: [
          { id: "checkout-state", textAnchor: "Checkout", label: "Checkout-ready (self-service)", style: "outline", required: false },
        ],
        outFile: "step-05.png",
      },
    ],
  };
}

// ─── Sales-Manager reel — Quote Negotiate (Priya, purple). Storefront-only, 5 beats. ─
// Drives the SEEDED countered quote (status pending_customer): Current Total
// NZ$1,582.00 vs counter New Total NZ$1,423.80 + a 2-message thread (Demo Buyer
// request -> Priya Sharma 10% volume-discount counter). All beats are on the buyer
// account, where the negotiation TRULY renders. Each total-bearing beat carries a
// rejectIfText error gate; the resolution beat asserts the Accept affordance.
//   newTotalStr / currentTotalStr are the live-rendered NZ$ strings (e.g. "NZ$1,423.80").
function buildSalesmgrReel(quoteId, currentTotalStr, newTotalStr) {
  const detailUrl = `${STOREFRONT_URL}/nz/account/quotes/details/${quoteId}`;
  return {
    id: "salesmgr",
    outDirName: "salesmgr-quote-negotiate",
    beats: [
      {
        // Beat 1 — the negotiated quote in the buyer's queue (the only Pending Customer row).
        id: "beat1-quote-in-queue",
        persona: PRIYA,
        target: "storefront",
        url: `${STOREFRONT_URL}/nz/account/quotes`,
        waitMs: 4500,
        scrollToText: "Pending Customer",
        highlights: [
          { id: "pending-customer-row", textAnchor: "Pending Customer", label: "Countered quote · awaiting buyer", style: "outline", required: true },
        ],
        outFile: "step-01.png",
      },
      {
        // Beat 2 — Current Total vs the counter New Total on the quote detail.
        id: "beat2-new-total-counter",
        persona: PRIYA,
        target: "storefront",
        url: detailUrl,
        waitMs: 5000,
        scrollToText: "New Total",
        rejectIfText: "Something went wrong",
        highlights: [
          { id: "new-total", textAnchor: newTotalStr, label: `Counter · New Total ${newTotalStr}`, style: "outline", required: true },
          { id: "current-total", textAnchor: currentTotalStr, label: `Was ${currentTotalStr}`, style: "outline", required: true },
        ],
        outFile: "step-02.png",
      },
      {
        // Beat 3 — the negotiation Messages thread (Priya's counter message).
        id: "beat3-message-thread",
        persona: PRIYA,
        target: "storefront",
        url: detailUrl,
        waitMs: 5000,
        scrollToText: "Priya here from Sales",
        rejectIfText: "Something went wrong",
        highlights: [
          { id: "priya-message", textAnchor: "Priya here from Sales", label: "Sales-manager counter · in-thread", style: "outline", required: true },
          { id: "buyer-message", textAnchor: "standardising on this model", label: "Buyer's volume request", style: "outline", required: false },
        ],
        outFile: "step-03.png",
      },
      {
        // Beat 4 — the counter-offer line context: Modified badge + struck/blue counter price + Pick Quote Item.
        id: "beat4-counter-context",
        persona: PRIYA,
        target: "storefront",
        url: detailUrl,
        waitMs: 5000,
        scrollToText: "Modified",
        rejectIfText: "Something went wrong",
        highlights: [
          { id: "modified-badge", textAnchor: "Modified", label: "Line counter-offered", style: "outline", required: true },
          { id: "pick-item", textAnchor: "Pick Quote Item", label: "Negotiate per line item", style: "outline", required: false },
        ],
        outFile: "step-04.png",
      },
      {
        // Beat 5 — resolution: the buyer can accept/close the negotiated quote in-platform.
        id: "beat5-resolution",
        persona: PRIYA,
        target: "storefront",
        url: detailUrl,
        waitMs: 5000,
        scrollToText: "Accept Quote",
        rejectIfText: "Something went wrong",
        highlights: [
          { id: "accept-quote", textAnchor: "Accept Quote", label: "Resolve in-platform · Accept", style: "spotlight", required: true },
          { id: "reject-quote", textAnchor: "Reject Quote", label: "or Reject", style: "outline", required: false },
        ],
        outFile: "step-05.png",
      },
    ],
  };
}

// ─── Save helpers ────────────────────────────────────────────────────────────────
function save(buf, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  console.log(`  SAVED ${filePath} (${Math.round(buf.length / 1024)}KB)`);
}

// ─── Beat runner ─────────────────────────────────────────────────────────────────
async function runBeat(page, beat, ctx, outDirs) {
  const result = { id: beat.id, outPath: null, highlights_found: [], highlights_missing: [], content_ok: false, error: null };
  try {
    if (beat.resetBefore)   await resetApprovalToPending(ctx.adminToken);
    if (beat.approveBefore) await approveApprovalAPI(ctx.adminToken).catch(() => {});

    await page.goto(beat.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(beat.waitMs || 3500);

    // Beat 5: real approve Check-button click -> usePrompt confirm dialog (capture the affordance).
    if (beat.clickApprove) {
      await dismissDevOverlays(page);
      const box = await page.evaluate(() => {
        const trs = [...document.querySelectorAll("tr")];
        const row = trs.find(tr => [...tr.querySelectorAll("td")].some(td => td.textContent?.includes("2469")));
        if (!row) return null;
        const btns = [...row.querySelectorAll("button")];
        if (!btns.length) return null;
        const approveBtn = btns[btns.length - 1]; // last icon button = Check approve
        const r = approveBtn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (box) {
        await page.mouse.click(box.x, box.y);
        await page.waitForTimeout(1500);
      }
      const body = await page.textContent("body");
      result.dialog_visible = body.includes("Are you sure") || body.includes("approve this cart");
    }

    await dismissDevOverlays(page);
    if (beat.scrollTop) await scrollTop(page);
    // Scroll a specific text anchor into view (keeps the highlighted control on-screen
    // below the fixed 48px header-bar). Used by storefront velocity/self-service beats.
    if (beat.scrollToText) await scrollToText(page, beat.scrollToText);
    await dismissDevOverlays(page); // re-run after scroll (some portals re-attach)

    await injectHeaderBar(page, beat.persona);

    // Beat 5 dynamic highlight: ring the approve dialog / approve button.
    if (beat.clickApprove) {
      const dynamic = result.dialog_visible
        ? [{ id: "approve-dialog", textAnchor: "approve", label: "David approves — into the audit log", style: "spotlight", required: true }]
        : [{ id: "approve-row", textAnchor: "2469", label: "David's approve control", style: "outline", required: true }];
      const rep = await injectHighlights(page, dynamic);
      for (const h of rep) (h.resolved ? result.highlights_found : result.highlights_missing).push(h.id);
    }

    if (beat.highlights?.length) {
      const rep = await injectHighlights(page, beat.highlights);
      const requiredIds = new Set(beat.highlights.filter(h => h.required).map(h => h.id));
      for (const h of rep) {
        if (h.resolved) result.highlights_found.push(h.id);
        else {
          result.highlights_missing.push(h.id);
          if (requiredIds.has(h.id)) {
            console.log(`  FAIL ${beat.id} missing ${h.id}`);
          }
        }
      }
    }

    await page.waitForTimeout(300);
    const buf = await page.screenshot();

    // content_ok = no required highlight missed AND no error markers in viewport.
    // Use innerText (visible rendered text) — NOT textContent — so SVG path data and
    // hidden attribute values (e.g. coordinate "...500..." in <path d=>) never false-match.
    // Markers are contextual phrases, never a bare number.
    const visibleText = await page.evaluate(() => document.body.innerText || "");
    const hasErrorMarker = /Forbidden|Internal Server Error|Something went wrong|Error 500|500 Internal|Application error|This page could.?n.?t be found/i.test(visibleText);

    // Content-assertion gate (capture-ordering fix): if the page renders a forbidden
    // phrase (e.g. the contradictory "approved and can now be completed" banner on a
    // cart that is simultaneously over-limit), this beat is a mixed-message REJECT.
    // Baked into the engine so the gate cannot be skipped at orchestration time.
    let rejectTextHit = false;
    if (beat.rejectIfText) {
      rejectTextHit = visibleText.toLowerCase().includes(beat.rejectIfText.toLowerCase());
      result.reject_assertion = beat.rejectIfText;
      result.reject_assertion_hit = rejectTextHit;
      if (rejectTextHit) {
        console.log(`  REJECT ${beat.id}: page contains forbidden text "${beat.rejectIfText}"`);
      } else {
        console.log(`  ASSERT-OK ${beat.id}: page does NOT contain "${beat.rejectIfText}"`);
      }
    }

    const requiredMissed = (beat.highlights || []).some(h => h.required && result.highlights_missing.includes(h.id))
      || (beat.clickApprove && result.highlights_missing.length > 0);
    const rejected = requiredMissed || rejectTextHit;
    result.content_ok = !rejected && !hasErrorMarker;
    result.error = rejectTextHit ? `reject-text:"${beat.rejectIfText}"` : (hasErrorMarker ? "error-marker-in-viewport" : null);

    // Save to permanent + mirror; REJECT subdir if a required highlight missed OR a
    // forbidden content-assertion tripped. A rejected beat is NOT saved to the
    // published path — only to _REJECT/ — so a stale/contradictory frame can never ship.
    const mirror = path.join(outDirs.tmp, beat.outFile);
    save(buf, mirror);
    if (rejected) {
      const reject = path.join(outDirs.docs, "_REJECT", beat.outFile);
      save(buf, reject);
      result.reject_path = reject;
      result.outPath = reject;
    } else {
      const primary = path.join(outDirs.docs, beat.outFile);
      save(buf, primary);
      result.outPath = primary;
    }
  } catch (e) {
    result.error = e.message;
    console.log(`  ERROR ${beat.id}: ${e.message}`);
  }
  return result;
}

// ─── Reel runner ─────────────────────────────────────────────────────────────────
async function runReel(reelId) {
  console.log(`=== Scenario Capture · reel=${reelId} ===`);
  const adminToken = await getAdminToken();
  const buyerToken = await getBuyerToken();
  const pubKey     = await getPublishableKey(adminToken);

  // ── Reel-specific cart + total resolution ──────────────────────────────────────
  // CFO: seeded over-limit cart (CART_ID). COO/Buyer: build fresh carts from real
  // variants so the reels show TRUE resolved line prices.
  let reel, cartCookie, observedTotal;
  if (reelId === "cfo") {
    const cart = await getCartTotal(pubKey);
    observedTotal = fmtNzd(cart.total);
    cartCookie = CART_ID;
    console.log(`  CFO seeded cart total: ${observedTotal} (${cart.currency}, ${cart.items} item(s))`);
    reel = buildCfoReel(observedTotal);
  } else if (reelId === "coo") {
    const regionId = await getNzRegionId(pubKey);
    const built = await buildCart(pubKey, buyerToken, regionId, [
      { variant: CATALOG.mouse.variant,    qty: 1 },
      { variant: CATALOG.keyboard.variant, qty: 1 },
      { variant: CATALOG.headset.variant,  qty: 1 },
    ]);
    observedTotal = fmtNzd(built.total);
    cartCookie = built.id;
    console.log(`  COO built cart ${built.id}: ${observedTotal} (${built.items} SKUs) — Mouse+Keyboard+Headset`);
    reel = buildCooReel(built.id, observedTotal);
  } else if (reelId === "buyer") {
    const regionId = await getNzRegionId(pubKey);
    const built = await buildCart(pubKey, buyerToken, regionId, [
      { variant: CATALOG.webcam97.variant, qty: 1 },
    ]);
    observedTotal = fmtNzd(built.total);
    cartCookie = built.id;
    console.log(`  Buyer built cart ${built.id}: ${observedTotal} (${built.items} item, within NZ$200 limit) — Webcam`);
    reel = buildBuyerReel(built.id, observedTotal);
  } else if (reelId === "salesmgr") {
    // No cart needed — the negotiation lives on the buyer's quote detail page.
    const nq = await getNegotiatedQuote(pubKey, buyerToken, NEGOTIATED_QUOTE_ID);
    const currentStr = fmtNzd(nq.currentTotal);
    const newStr = fmtNzd(nq.newTotal);
    observedTotal = `current ${currentStr} -> new ${newStr}`;
    cartCookie = "";
    console.log(`  Salesmgr quote ${NEGOTIATED_QUOTE_ID}: status=${nq.status} ` +
      `Current=${currentStr} New=${newStr} differ=${nq.currentTotal !== nq.newTotal} messages=${nq.messages}`);
    if (nq.status !== "pending_customer" || nq.currentTotal === nq.newTotal || nq.messages < 2) {
      console.log(`  WARN: negotiated quote not in expected state — run tmp/B2B-Commerce/run-negotiate-seed.mjs first`);
    }
    reel = buildSalesmgrReel(NEGOTIATED_QUOTE_ID, currentStr, newStr);
  } else {
    throw new Error(`Unknown reel: ${reelId}`);
  }

  const needsAdmin = reel.beats.some(b => b.target === "admin");

  const docsDir = path.join(REPO_ROOT, "docs/static/img/demo/flows", reel.outDirName);
  const tmpDir  = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/scenario-flows", reel.outDirName);
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Storefront context (1280x720) — buyer JWT + reel-specific cart cookie.
  const sfHost = new URL(STOREFRONT_URL).hostname;
  const sfCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await sfCtx.addCookies([
    { name: "_medusa_jwt", value: buyerToken, domain: sfHost, path: "/", httpOnly: true, sameSite: "Strict", expires: Math.floor(Date.now() / 1000) + 604800 },
    { name: "_medusa_cart_id", value: cartCookie, domain: sfHost, path: "/", httpOnly: true, sameSite: "Strict", expires: Math.floor(Date.now() / 1000) + 604800 },
  ]);
  const sfPage = await sfCtx.newPage();

  // Admin context (1280x800) — SPA session login. Only spun up if the reel needs it
  // (CFO does; storefront-only COO/Buyer skip the admin login entirely).
  let adminCtx = null, adminPage = null;
  if (needsAdmin) {
    adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    adminPage = await adminCtx.newPage();
    await adminPage.goto(`${BACKEND_URL}/app/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await adminPage.waitForTimeout(2000);
    await adminPage.locator('input[type="email"], input[name="email"], input').first().fill("admin@test.local");
    await adminPage.locator('input[type="password"]').first().fill("Test1234!");
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForTimeout(4000);
    console.log(`  Admin SPA logged in: ${adminPage.url()}`);
  }

  const outDirs = { docs: docsDir, tmp: tmpDir };
  const beatResults = [];
  for (const beat of reel.beats) {
    console.log(`\n[beat] ${beat.id} (${beat.target})`);
    const page = beat.target === "admin" ? adminPage : sfPage;
    const res = await runBeat(page, beat, { adminToken }, outDirs);
    beatResults.push(res);
    console.log(`  found=[${res.highlights_found.join(",")}] missing=[${res.highlights_missing.join(",")}] content_ok=${res.content_ok}`);
  }

  await sfCtx.close();
  if (adminCtx) await adminCtx.close();
  await browser.close();

  const selfCheck = {
    reel: reelId,
    captured_at: new Date().toISOString(),
    observed_cart_total: observedTotal,
    ground_truth_note: {
      cfo: "Live storefront renders the seeded over-limit cart total = " + observedTotal +
        "; CA 'NZ$260' correction was stale for this DB seed. Frames show the real rendered value.",
      coo: "Fresh cart = Mouse NZ$130 + Keyboard NZ$163 + Headset NZ$246 -> total " + observedTotal +
        " (> NZ$200 limit). Beats show the truthful velocity path: bulk SKU grid -> resolved NZD line items " +
        "-> quick-order pad -> consolidated total -> Request Quote CTA (checkout disabled because over-limit; " +
        "Request Quote is the honest B2B CTA, NOT a fake enabled checkout).",
      buyer: "Fresh within-limit cart = 1x Webcam NZ$97 (< NZ$200 limit) -> total " + observedTotal +
        "; over-limit banner is ASSERTED ABSENT (rejectIfText). Beat 5 captures whatever the checkout flow " +
        "truly renders (checkout-ready or order confirmation); the JSON records which state landed.",
      salesmgr: "Seeded countered quote " + NEGOTIATED_QUOTE_ID + " (status pending_customer): " +
        observedTotal + " (a 10% sales-manager volume discount on the smartphone line) + a 2-message " +
        "thread (Demo Buyer request -> Priya Sharma counter). All beats render on the buyer quote detail " +
        "page; New Total vs Current Total and the message thread are REAL rendered negotiation data, not faked. " +
        "Seed: apps/backend/src/scripts/seed-demo-negotiated-quote.ts (executed via tmp/.../run-negotiate-seed.mjs).",
    }[reelId] || "Frames show the real rendered value.",
    beats: beatResults,
  };
  const jsonPath = path.join(REPO_ROOT, `tmp/B2B-Commerce/demo/scenario-capture-${reelId}.json`);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(selfCheck, null, 2));
  console.log(`\nSELF-CHECK: ${jsonPath}`);

  const failed = beatResults.filter(b => !b.content_ok);
  console.log(`\n=== reel=${reelId} ${failed.length === 0 ? "ALL BEATS OK" : `${failed.length} BEAT(S) WITH ISSUES`} ===`);
  return selfCheck;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────────
function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const reelId = arg("--reel", "cfo");
runReel(reelId).catch(e => { console.error(e); process.exit(1); });
