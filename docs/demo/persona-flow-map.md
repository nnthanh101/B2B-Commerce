# Persona-Flow Map — Digital-Commerce B2B Demo

> Machine-readable contract for `scripts/batch-demo-video.sh`.
> Each flow carries ONE HTML-comment marker (grep-deterministic). The batch script greps
> `<!-- flow:<slug> owner:<persona> goal:"..." -->` to inject the persona goal as the reel's
> opening narration line. No flow has more than one owner marker.
>
> Source of truth: `tmp/Digital-Commerce/coordination-logs/product-owner-2026-06-06-zazzy.json`
> Ownership invariants: buyer owns 6, admin owns 4, sales-manager owns 1.
> Evidence-bound: only Phase-2-green flows produce reels; flow-11 voices token-accept only (GAP-006).

---

<!-- flow:01-cart-to-quote owner:buyer-employee goal:"Maria skips the 3-day email sign-off — one click turns a cart into an approval-ready quote in minutes, not days" -->

<!-- flow:02-approval owner:admin goal:"David approves or rejects a quote with a comment and an audit trail in one click — buyer is notified instantly, every decision is on record" -->

<!-- flow:03-company-mgmt owner:admin goal:"David governs members, roles, and limits from one company console — full team control without a support ticket" -->

<!-- flow:04-spending-limit owner:buyer-employee goal:"Maria sees live remaining budget at the cart — the system blocks over-policy before she even submits" -->

<!-- flow:05-quote-negotiate owner:sales-manager goal:"Sofia counters price and terms in-platform with a full message trail both sides see — faster close, immutable record" -->

<!-- flow:06-promotions owner:buyer-employee goal:"Maria watches bulk and time-based discounts auto-apply — savings are visible at the cart before checkout" -->

<!-- flow:07-full-ecommerce owner:buyer-employee goal:"Maria browses, adds, and checks out end-to-end — the B2B storefront is a real store, not a mockup" -->

<!-- flow:08-order-edit owner:admin goal:"David edits an order post-placement for a customer change — buyer is notified, no re-order churn, no apology email" -->

<!-- flow:09-bulk-add owner:buyer-employee goal:"Maria imports a multi-item field list into the cart in seconds — no re-keying, no copy-paste errors" -->

<!-- flow:10-quick-order-pad owner:buyer-employee goal:"Maria re-orders known SKUs from a fast entry pad without digging through the catalog" -->

<!-- flow:11-invite-employee owner:admin goal:"David generates and tracks an invite — the employee accepts via token; email delivery is deferred (GAP-006), this reel voices the green token-accept slice only" -->

---

## Feature x Persona x Value Matrix

| Flow | Slug | Owner persona | Participant | Value (buyable outcome) |
|------|------|---------------|-------------|------------------------|
| 01 | cart-to-quote | buyer-employee (Maria) | — | Maria skips the 3-day email sign-off — one click turns a cart into an approval-ready quote in minutes, not days |
| 02 | approval | admin (David) | sales-manager (Sofia, seller-side awaiting clearance) | David approves or rejects with a comment and an audit trail in one click; buyer is auto-notified |
| 03 | company-mgmt | admin (David) | — | David governs members, roles, and limits from one company console |
| 04 | spending-limit | buyer-employee (Maria) | admin (David sets the limit) | Maria sees live remaining budget; system blocks over-policy before submit |
| 05 | quote-negotiate | sales-manager (Sofia) | buyer-employee (Maria, submits counter) | Sofia counters price and terms in-platform with a full message trail both sides see — faster close, immutable record |
| 06 | promotions | buyer-employee (Maria) | — | Maria watches bulk and time-based discounts auto-apply — savings visible at the cart |
| 07 | full-ecommerce | buyer-employee (Maria) | — | Maria browses, adds, and checks out end-to-end — the B2B storefront is a real store |
| 08 | order-edit | admin (David) | — | David edits an order post-placement; buyer notified — no re-order churn |
| 09 | bulk-add | buyer-employee (Maria) | — | Maria imports a multi-item list into the cart in seconds |
| 10 | quick-order-pad | buyer-employee (Maria) | — | Maria re-orders known SKUs from a fast entry pad |
| 11 | invite-employee | admin (David) | — | David generates and tracks an invite; employee accepts via token (GAP-006: email delivery deferred; reel voices green token-accept slice only) |

---

## Ownership Invariants (from PO authority)

| Persona | Owned flows | Count |
|---------|-------------|-------|
| buyer-employee (Maria) | 01, 04, 06, 07, 09, 10 | 6 — PRIMARY (most flows) |
| admin (David) | 02, 03, 08, 11 | 4 |
| sales-manager (Sofia) | 05 | 1 |

**INVISIBLE_PRIMARY_USER guard satisfied**: buyer-employee owns 6 of 11 (the most) and is named PRIMARY.
**No double-ownership**: each of the 11 flows has exactly one owner.
**Evidence-bound**: flow-11 reel voices token-accept only (GAP-006); any flow with a FAIL verdict is excluded from capture.

---

## Grep verification (for batch script and code-reviewer)

The batch script MUST use the anchored form (`^<!-- flow:`) to match real markers only.
The prose description line in the header (inside a blockquote) also contains `<!-- flow:` but
is NOT anchored to column 0 — the anchored grep excludes it cleanly.

```bash
# Batch script: extract owner+goal for a specific flow (e.g. 01-cart-to-quote)
grep '^<!-- flow:01-cart-to-quote ' docs/demo/persona-flow-map.md

# Code-reviewer: confirm all 11 markers are present
grep -c '^<!-- flow:' docs/demo/persona-flow-map.md   # must return 11

# Extract all flow slugs in order (for set comparison vs green-verdict)
grep '^<!-- flow:' docs/demo/persona-flow-map.md | grep -o 'flow:[0-9][0-9]-[a-z-]*' | sort
```

Expected slug output (11 lines, in order):

```
flow:01-cart-to-quote
flow:02-approval
flow:03-company-mgmt
flow:04-spending-limit
flow:05-quote-negotiate
flow:06-promotions
flow:07-full-ecommerce
flow:08-order-edit
flow:09-bulk-add
flow:10-quick-order-pad
flow:11-invite-employee
```
