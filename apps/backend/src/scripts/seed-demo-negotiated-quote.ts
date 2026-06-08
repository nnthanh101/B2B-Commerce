/**
 * Demo Seed — Sales-Manager Quote Negotiation (Priya) — `medusa exec` path
 * ────────────────────────────────────────────────────────────────────────
 * Scope: b2b-demo-salesmgr-quote-negotiate
 *
 * Purpose:
 *   Advance ONE existing demo-buyer quote from `pending_merchant` (draft_total
 *   == new_total, 0 messages) to a MERCHANT-COUNTERED state so the buyer-side
 *   quote detail page (.../account/quotes/details/[id]) renders:
 *     - Current Total  (draft_order.total)              != New Total (preview.total)
 *     - a Messages thread with >= 2 messages (buyer request + Priya counter)
 *     - status pending_customer  -> Accept / Reject affordance is shown
 *
 * Mechanism (real Medusa v2 — NO invented schema):
 *   The RFQ already opened an order-edit (order_change, status=pending, 0 actions)
 *   on the quote's draft order. A merchant counter is a price change staged into
 *   that open edit via `orderEditUpdateItemQuantityWorkflow` (core-flow), which
 *   the store /quotes/[id]/preview route surfaces through `previewOrderChange`
 *   as the "New Total". We then add 2 quote messages via the project's own
 *   `createQuoteMessageWorkflow`, and flip status to pending_customer.
 *
 * Counter applied: lower the single line item's unit_price by ~10% (a volume
 *   discount the sales manager extends to win the deal). The per-line table cell
 *   then renders the original price struck-through and the counter in blue.
 *
 * Idempotent: re-running detects the already-countered state (status
 *   pending_customer AND >=2 messages AND preview.total != order.total) and is a
 *   no-op. Messages are de-duplicated by exact text. Reversible + local only.
 *
 * Run (inside container):
 *   npx medusa exec ./src/scripts/seed-demo-negotiated-quote.ts
 * Run (from host):
 *   docker exec ec_backend npx medusa exec ./src/scripts/seed-demo-negotiated-quote.ts
 */

import { ExecArgs, IOrderModuleService } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { orderEditUpdateItemQuantityWorkflow } from "@medusajs/core-flows";
import { QUOTE_MODULE } from "../modules/quote";
import { createQuoteMessageWorkflow } from "../workflows/quote/workflows";

const BUYER_EMAIL = "demo-buyer@democorp.local";
const COUNTER_FACTOR = 0.9; // sales-manager extends a ~10% volume discount

// Negotiation thread content (de-duped by exact text on re-run).
const BUYER_MSG =
  "Hi — we're standardising on this model fleet-wide and would like to place a " +
  "larger recurring order. Can you sharpen the unit price for us?";
const MERCHANT_MSG =
  "Priya here from Sales. Thanks for the volume commitment — I've applied a 10% " +
  "volume discount on this line. Revised total is below; happy to finalise once " +
  "you approve.";

export default async function seedNegotiatedQuote({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const orderModule = container.resolve<IOrderModuleService>(Modules.ORDER);
  const userModule = container.resolve(Modules.USER);

  // ── 1. Resolve buyer + pick a deterministic target quote ──────────────────
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { email: BUYER_EMAIL },
  });
  if (!customers.length) {
    logger.error(`[negotiate-seed] customer ${BUYER_EMAIL} not found — run seed-demo-b2b first`);
    return;
  }
  const customerId = customers[0].id;

  const { data: quotes } = await query.graph({
    entity: "quote",
    fields: [
      "id",
      "status",
      "draft_order_id",
      "order_change_id",
      "created_at",
      "messages.id",
      "messages.text",
    ],
    filters: { customer_id: customerId },
  });
  if (!quotes.length) {
    logger.error(`[negotiate-seed] no quotes for ${BUYER_EMAIL} — run seed-demo-b2b first`);
    return;
  }

  // Prefer an already-countered quote (so re-runs target the SAME one); else the
  // most recently created pending_merchant quote.
  const sorted = [...quotes].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const alreadyCountered = sorted.find(
    (q: any) => q.status === "pending_customer" && (q.messages?.length || 0) >= 2
  );
  const target = alreadyCountered || sorted[0];

  logger.info(
    `[negotiate-seed] target quote ${target.id} (status=${target.status}, ` +
      `draft_order=${target.draft_order_id}, messages=${target.messages?.length || 0})`
  );

  // ── 2. Read draft-order line item + current totals ────────────────────────
  const draftOrder = await orderModule.retrieveOrder(target.draft_order_id, {
    relations: ["items"],
  });
  const items = draftOrder.items || [];
  if (!items.length) {
    logger.error(`[negotiate-seed] draft order ${target.draft_order_id} has no items`);
    return;
  }
  const line = items[0];
  const currentTotalBefore = Number(draftOrder.total);
  const originalUnitPrice = Number(line.unit_price);
  const counterUnitPrice = Math.round(originalUnitPrice * COUNTER_FACTOR * 100) / 100;

  logger.info(
    `[negotiate-seed] line "${line.title}" qty=${line.quantity} ` +
      `unit_price=${originalUnitPrice} -> counter ${counterUnitPrice} ` +
      `(current order total=${currentTotalBefore})`
  );

  // ── 3. Stage the merchant counter into the open order-edit (price drop) ────
  // Only stage if the preview total does not already reflect the counter.
  let previewBefore = await orderModule.previewOrderChange(target.draft_order_id);
  const previewTotalBefore = Number((previewBefore as any).total);

  const counterAlreadyStaged =
    Math.abs(previewTotalBefore - currentTotalBefore) > 0.001;

  if (!counterAlreadyStaged) {
    await orderEditUpdateItemQuantityWorkflow(container).run({
      input: {
        order_id: target.draft_order_id,
        items: [
          {
            id: line.id,
            quantity: Number(line.quantity),
            unit_price: counterUnitPrice,
          },
        ],
      },
    });
    logger.info(`[negotiate-seed] counter staged into order-edit`);
  } else {
    logger.info(
      `[negotiate-seed] counter already staged (preview ${previewTotalBefore} != current ${currentTotalBefore}) — skipping price step`
    );
  }

  // ── 4. Give the merchant user a human name so the thread shows "Priya …" ──
  const [adminUser] = await userModule.listUsers({}, { take: 1 });
  let adminId: string | undefined = adminUser?.id;
  if (adminUser && (!adminUser.first_name || !adminUser.last_name)) {
    await userModule.updateUsers({
      id: adminUser.id,
      first_name: "Priya",
      last_name: "Sharma",
    });
    logger.info(`[negotiate-seed] named merchant user ${adminUser.id} -> Priya Sharma`);
  }

  // ── 5. Add the 2-message negotiation thread (de-dup by exact text) ────────
  const existingTexts = new Set((target.messages || []).map((m: any) => m.text));

  if (!existingTexts.has(BUYER_MSG)) {
    await createQuoteMessageWorkflow(container).run({
      input: { quote_id: target.id, text: BUYER_MSG, customer_id: customerId },
    });
    logger.info(`[negotiate-seed] added buyer message`);
  }
  if (!existingTexts.has(MERCHANT_MSG)) {
    await createQuoteMessageWorkflow(container).run({
      input: { quote_id: target.id, text: MERCHANT_MSG, admin_id: adminId },
    });
    logger.info(`[negotiate-seed] added merchant (Priya) counter message`);
  }

  // ── 6. Flip status to pending_customer (counter sent to buyer for decision) ─
  if (target.status !== "pending_customer") {
    const quoteModule: any = container.resolve(QUOTE_MODULE);
    await quoteModule.updateQuotes({ id: target.id, status: "pending_customer" });
    logger.info(`[negotiate-seed] status -> pending_customer`);
  }

  // ── 7. Verify + report fetched values ─────────────────────────────────────
  const verifyOrder = await orderModule.retrieveOrder(target.draft_order_id);
  const verifyPreview = await orderModule.previewOrderChange(target.draft_order_id);
  const { data: verifyQuotes } = await query.graph({
    entity: "quote",
    fields: ["id", "status", "messages.id", "messages.text", "messages.admin_id", "messages.customer_id"],
    filters: { id: target.id },
  });
  const vq = verifyQuotes[0];

  const report = {
    quote_id: target.id,
    draft_order_id: target.draft_order_id,
    status: vq.status,
    current_total: Number(verifyOrder.total),
    new_total: Number((verifyPreview as any).total),
    totals_differ: Math.abs(Number(verifyOrder.total) - Number((verifyPreview as any).total)) > 0.001,
    message_count: vq.messages?.length || 0,
    messages: (vq.messages || []).map((m: any) => ({
      from: m.admin_id ? "merchant" : "customer",
      text: m.text.slice(0, 60) + (m.text.length > 60 ? "…" : ""),
    })),
  };

  logger.info(`[negotiate-seed] RESULT ${JSON.stringify(report, null, 2)}`);
  logger.info(
    `[negotiate-seed] DONE — Current=${report.current_total} New=${report.new_total} ` +
      `differ=${report.totals_differ} messages=${report.message_count} status=${report.status}`
  );
}
