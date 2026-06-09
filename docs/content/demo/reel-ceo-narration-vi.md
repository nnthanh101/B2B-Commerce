---
title: "CEO Reel Narration — Cart to Quote to Approval (Vietnamese / VND)"
description: Vietnamese narration script for the CEO reel localized to VND pricing and Linh TTS. 6-beat arc, Maria/David personas, ₫ figures from /vn region capture.
sidebar_position: 11
tags: [demo, narration, ceo-reel, vietnamese, vnd, cart-to-quote, approval]
source_refs:
  - path: "docs/content/demo/flows/01-cart-to-quote.md"
    last_compiled: "2026-06-08"
  - path: "docs/content/demo/flows/02-approval.md"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
reel: ceo-vietnamese
voice: Linh
locale: vi_VN
region: vn
currency: vnd
frames:
  beat1: docs/static/img/demo/flows/01-cart-to-quote-vn/step-01.png
  beat2: docs/static/img/demo/flows/01-cart-to-quote-vn/step-04.png
  beat3: docs/static/img/demo/flows/01-cart-to-quote-vn/step-05.png
  beat4: docs/static/img/demo/flows/02-approval-vn/step-01.png
  beat5: docs/static/img/demo/flows/02-approval-vn/step-05b-govern-approve.png
  beat6: docs/static/img/demo/flows/02-approval-vn/step-06b-approved-audit.png
---

# CEO Reel — Cart to Quote to Approval: Ngày Thành Phút, Chi Tiêu Có Kiểm Soát (Vietnamese/VND)

**Reel arc**: Setup (deadline) → Trigger (one click) → Quote created → Handoff → Govern + Approve → Approved

**Persona protagonist**: Maria (chuyên viên thu mua, nhà sản xuất Việt Nam) — value-trigger
**Persona resolution**: David (giám đốc thu mua) — governance owner
**Audience**: Non-technical executive — C-level demo for VN/APAC market
**Currency**: VND (đồng Việt Nam) — whole-number ₫, storefront /vn region (region=vnd, native render)
**Voice**: Linh (macOS vi_VN TTS)
**Note on ₫ figures**: exact values measured from /vn cart at capture time (measure-never-forecast).

---

## Beat 1 — Setup: Giỏ Hàng Đầy, Gần Kỳ Chốt Quý

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote-vn/step-01.png`
**On screen**: /vn cart — 3 items, ₫ total, spending-limit warning, Request Quote CTA, role-bar Maria

**Narration**:
> Maria phụ trách thu mua cho một nhà máy ở Việt Nam. Chỉ còn bốn ngày là tới kỳ chốt quý, mà giỏ hàng hôm nay đã lên tới bảy mươi triệu bốn trăm hai mươi lăm nghìn đồng Việt Nam cho ba mặt hàng. Theo cách làm cũ, một báo giá là phải qua lại email mấy lượt, xin chữ ký từng cấp, chờ ba đến năm ngày — lần nào cũng đủ để trễ ngân sách.

---

## Beat 2 — Trigger: Một Cú Nhấp Thành Báo Giá

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote-vn/step-04.png`
**On screen**: "Submit request for quote" modal open, Cancel and Submit buttons, role-bar Maria

**Narration**:
> Giờ thì chỉ một cú nhấp, cả giỏ hàng thành ngay một yêu cầu báo giá chính thức. Không còn chuỗi email — chỉ một bước xác nhận, rồi giỏ hàng thành báo giá. Maria bấm Gửi.

---

## Beat 3 — Quote Created: Chờ Phê Duyệt

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote-vn/step-05.png`
**On screen**: Buyer Quotes list, status Pending Merchant, ₫ total visible, role-bar Maria

**Narration**:
> Chưa đầy chín mươi giây, báo giá đã vào hệ thống. Maria thấy nó hiện ngay trên tài khoản, đang chờ nhà cung cấp xác nhận. Cấp trên của cô cũng được báo tức thì. Không phải nhắc, không phải hỏi tới hỏi lui.

---

## Beat 4 — Handoff: Hàng Đợi Phê Duyệt Của David

**Frame**: `docs/static/img/demo/flows/02-approval-vn/step-01.png`
**On screen**: Admin Approvals list, pending approval, Demo Corp, role-bar David

**Narration**:
> Phía quản trị, David — giám đốc thu mua — thấy yêu cầu nằm sẵn trong hàng chờ duyệt ngay lúc Maria vừa gửi. Không phải chuyển tiếp email, không CC lòng vòng. Báo giá chạy thẳng tới đúng người cần duyệt.

---

## Beat 5 — Govern and Approve: Phê Duyệt Một Thao Tác

**Frame**: `docs/static/img/demo/flows/02-approval-vn/step-05b-govern-approve.png`
**On screen**: Admin Approvals — approve action visible/dialog, role-bar David

**Narration**:
> David xem qua một lượt: khoản chi rõ ràng, đúng công ty, đúng chính sách. Anh duyệt chỉ bằng một thao tác — chi tiêu vẫn nằm trong hạn mức, tính bằng đồng Việt Nam, và mỗi quyết định đều có nhật ký kiểm toán đi kèm.

---

## Beat 6 — Resolution: Đã Phê Duyệt

**Frame**: `docs/static/img/demo/flows/02-approval-vn/step-06b-approved-audit.png`
**On screen**: Admin Approvals — Approved status badge, Demo Corp, role-bar David

**Narration**:
> Trạng thái chuyển sang Đã Duyệt. Việc trước đây mất ba đến năm ngày, giờ gói gọn trong vài phút. Ngân sách của Maria được giữ, kịp kỳ chốt quý, và mọi quyết định đều có hồ sơ. Ngày rút thành phút — mà vẫn nắm chắc chi tiêu, đầy đủ nhật ký kiểm toán.

---

## Role-bar labels (vi)

On-screen role-bar strings for commerce-engineer to inject into the /vn capture (replaces the
English role-bar on each beat frame). Natural VN B2B titles a Vietnamese executive would use.

| Persona | Role-bar label (vi) | Beats |
|---------|---------------------|-------|
| Maria | `Maria · Chuyên viên Thu mua` | 1, 2, 3 |
| David | `David · Giám đốc Thu mua` | 4, 5, 6 |

Exact strings (copy-paste, middot `·` U+00B7):

```
Maria · Chuyên viên Thu mua
David · Giám đốc Thu mua
```

Note: "Giám đốc Thu mua" (procurement director) is the natural VN title for the governance owner;
it reads as a real seniority level. "Chuyên viên Thu mua" (procurement specialist) is the standard
VN job title for the buyer role. Avoid "Giám đốc Phê duyệt" — VN procurement teams name the role by
function (thu mua), not by the act of approving.

---

## Narration Notes

- **Currency**: VND (đồng Việt Nam) throughout. ₫ figures are the storefront's own `calculated_price` for the `vn` region (NOT an NZD overlay). Narrate "đồng Việt Nam" on first ₫ mention; whole-number, no decimals.
- **₫ figures (measured)**: cart total ₫70,425,000 (spoken "bảy mươi triệu bốn trăm hai mươi lăm nghìn đồng Việt Nam" on beat 1). Line items ₫14,975,000 / ₫23,975,000 / ₫31,475,000 — sum to the cart total; not re-spoken individually to keep beat 1 ≤ TTS budget. Values from the real /vn storefront render (measure-never-forecast).
- **Beat 6 audit trail**: Status flip to Approved on approvals list. No visible audit panel in this release. Narration references "nhật ký kiểm toán" (audit trail) as outcome without fabricating a panel.
- **Parity with A/A+ NZD reel**: Same 6 beats, same role-bar (Maria/David), same highlight targets; only currency + language localized. Regression guard: NZD defaults (no env vars) reproduce the A/A+ reel byte-identically.
- **Measure-never-forecast**: Exact ₫ cart total filled at capture time by the capture script from the real /vn storefront render; the spoken figure on beat 1 must match the captured frame.
