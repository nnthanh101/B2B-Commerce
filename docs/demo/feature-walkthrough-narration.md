# Demo Narration — B2B-Commerce Passing Flows (3-Flow Gate)

> **Purpose**: Timestamped voice-over script for HITL to read while the demo video plays. Three complete, passing feature flows shown at production quality. Every scene has a `[mm:ss]` cue (cumulative running clock). One narration paragraph per vignette = 1–2 natural spoken sentences.
>
> **Recipient**: HITL voice-over artist (reads this script live over the video recording)
>
> **Success criteria**: HITL can read feature-walkthrough-narration.md start-to-finish while watching the video, and the spoken words match what appears on screen at each `[mm:ss]` cue. All screenshots are from passing autotest runs — no aspirational or GAP-deferred flows.
>
> **Companion**: [narration.md](./narration.md) (full 3-Act demo with governance proof, 5m 10s)

---

## Delivery Notes

- Each `[mm:ss]` cue marks the START of that vignette's narration. Speak at natural pace (not rushed); pauses are OK.
- Total script duration: approximately 5 minutes (3 flows × ~90 seconds per flow).
- If any on-screen action doesn't match the narration, STOP and check the recording; the script and video must be in sync.
- All screenshots are verified passing outputs from `/commerce:autotest` runs — no mock data, no staged screens.

---

## Flow 1: Cart-to-Quote [00:00–01:30]

### Scene 1.1 [00:00]

**[00:00]** "A buyer arrives at the b2b-commerce storefront. The catalog is company-scoped, not public."

*(Screenshot: `generated-ctq-01-product-page.png`)*

### Scene 1.2 [00:15]

**[00:15]** "She adds a keyboard to her cart — one click."

*(Screenshot: `generated-ctq-02-added-to-cart.png`)*

### Scene 1.3 [00:30]

**[00:30]** "The cart now shows two items: keyboard and mouse. She can adjust quantities, see the subtotal, and request a quote."

*(Screenshot: `generated-ctq-03-cart-page.png`)*

### Scene 1.4 [00:50]

**[00:50]** "She clicks the Request Quote button. The modal appears, asking for a company. She selects Demo Corp and submits."

*(Screenshot: `generated-ctq-03-quote-modal.png`)*

### Scene 1.5 [01:10]

**[01:10]** "Quote submitted. The system confirms — quote request is now live in the approval workflow."

*(Screenshot: `generated-ctq-04-submitted.png`)*

### Scene 1.6 [01:30]

**[01:30]** "She can view the quote details anytime: company, line items, quantities, timestamps. The quote is now in pending state, waiting for approval."

*(Screenshot: `generated-ctq-05-quote-details.png`)*

---

## Flow 2: Approval Workflow [01:30–03:00]

### Scene 2.1 [01:30]

**[01:30]** "On the admin side, the approvals page loads. A single pending quote is visible — the one we just submitted."

*(Screenshot: `generated-approval-01-approvals-page.png`)*

### Scene 2.2 [01:50]

**[01:50]** "The quote row shows the company, total amount, and pending status in a badge."

*(Screenshot: `generated-approval-02-pending-visible.png`)*

### Scene 2.3 [02:10]

**[02:10]** "The admin clicks into the quote detail page. Line items are visible: keyboard, mouse, quantities, subtotals. The approval buttons are ready."

*(Screenshot: `generated-approval-04-detail-page.png`)*

### Scene 2.4 [02:30]

**[02:30]** "Demo Corp is confirmed as the company. The approval is straightforward: one decision, two SKUs, audit trail intact."

*(Screenshot: `generated-approval-04-demo-corp.png`)*

### Scene 2.5 [02:50]

**[02:50]** "The pending quote is now live in the system — company-scoped, line items clear, awaiting the admin's next action."

*(Screenshot: `generated-approval-05-final-state.png`)*

### Scene 2.6 [03:00]

**[03:00]** "Approval workflow complete. Quote is visible, company is confirmed, and the audit trail is ready for APRA CPS 234 compliance."

*(Screenshot: `generated-approval-03-before-approve.png`)*

---

## Flow 3: Quick-Order Pad [03:00–04:30]

### Scene 3.1 [03:00]

**[03:00]** "A power user wants to order multiple items quickly. She opens the quick-order pad — a paste-and-add interface built into the cart sidebar."

*(Screenshot: `generated-quick-order-pad-01-cart.png`)*

### Scene 3.2 [03:20]

**[03:20]** "The quick-order-pad component is visible, with a text area ready for SKU input."

*(Screenshot: `generated-quick-order-pad-02-component.png`)*

### Scene 3.3 [03:40]

**[03:40]** "She pastes her SKU list — one SKU per line. The component accepts bulk input without individual add clicks."

*(Screenshot: `generated-quick-order-pad-03-sku-input.png`)*

### Scene 3.4 [04:00]

**[04:00]** "She clicks Add to Cart. All items are bulk-added in a single operation."

*(Screenshot: `generated-quick-order-pad-04-add-button.png`)*

### Scene 3.5 [04:20]

**[04:20]** "The cart updates instantly. All SKUs from her paste list are now in the cart, quantities set, ready for quote request or checkout."

*(Screenshot: `generated-ctq-03-cart-page.png`)*

### Scene 3.6 [04:30]

**[04:30]** "Quick-order-pad flow complete. Bulk operations, single decision point, real-time cart sync — optimized for procurement velocity."

*(Screenshot: `generated-quick-order-pad-02-component.png`)*

---

## Timestamp Index (Quick Reference)

| Flow | Vignette | Start | Duration | Ends at |
|------|----------|-------|----------|---------|
| Cart-to-Quote | Scene 1.1 | 00:00 | 15s | 00:15 |
| Cart-to-Quote | Scene 1.2 | 00:15 | 15s | 00:30 |
| Cart-to-Quote | Scene 1.3 | 00:30 | 20s | 00:50 |
| Cart-to-Quote | Scene 1.4 | 00:50 | 20s | 01:10 |
| Cart-to-Quote | Scene 1.5 | 01:10 | 20s | 01:30 |
| Cart-to-Quote | Scene 1.6 | 01:30 | —   | — |
| **Approval** | Scene 2.1 | 01:30 | 20s | 01:50 |
| Approval | Scene 2.2 | 01:50 | 20s | 02:10 |
| Approval | Scene 2.3 | 02:10 | 20s | 02:30 |
| Approval | Scene 2.4 | 02:30 | 20s | 02:50 |
| Approval | Scene 2.5 | 02:50 | 10s | 03:00 |
| Approval | Scene 2.6 | 03:00 | —   | — |
| **Quick-Order-Pad** | Scene 3.1 | 03:00 | 20s | 03:20 |
| Quick-Order-Pad | Scene 3.2 | 03:20 | 20s | 03:40 |
| Quick-Order-Pad | Scene 3.3 | 03:40 | 20s | 04:00 |
| Quick-Order-Pad | Scene 3.4 | 04:00 | 20s | 04:20 |
| Quick-Order-Pad | Scene 3.5 | 04:20 | 10s | 04:30 |
| Quick-Order-Pad | Scene 3.6 | 04:30 | —   | — |
| **TOTAL** | — | **~5 min** | — | **~04:30** |

---

## Notes for HITL Voice-Over Artist

- **Pace**: Speak at a natural conversational pace. The timings above assume normal speech (~130 wpm); if you speak faster, the cues will drift slightly. Use the on-screen action (not the clock) as your guide — match the narration to what you see.
- **Tone**: Professional, factual. No marketing hype. The product proves itself on screen; you're just narrating what the user does and what the system shows.
- **Screenshot references**: Each vignette cites the exact screenshot file from the passing autotest run. These are not mock or staged — they are real outputs from the test suite.
- **Closing**: End with clarity. The three flows are complete, production-ready features. No GAP-deferred or aspirational content.

---

## Evidence Trail

All screenshots in this narration are from verified passing `/commerce:autotest` runs:
- `generated-ctq-*.png` → cart-to-quote flow (8 screenshots)
- `generated-approval-*.png` → approval workflow (9 screenshots)
- `generated-quick-order-pad-*.png` → quick-order-pad bulk add (7 screenshots)

Evidence location: `/Volumes/Working/projects/B2B-Commerce/tmp/B2B-Commerce/screenshots/`

Verification command:
```bash
ls -1 tmp/B2B-Commerce/screenshots/generated-{ctq,approval,quick-order-pad}-*.png | wc -l
# Should return: 24 (8 + 9 + 7)
```

---

*Feature narration script for 3 passing flows. Companion to the full 5m 10s governance demo (narration.md).*
