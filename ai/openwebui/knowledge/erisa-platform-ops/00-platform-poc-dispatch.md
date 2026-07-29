---
id: erisa-platform-ops.dispatch-guide
title: Platform PoC Dispatch Guide
audiences: [erisa]
owner: erisa-creator-services
sensitivity: department
status: active
tags: [platform-poc, dispatch, routing, escalation, tiktok-shop]
source_refs: ["ERISA_SOP_Platform Playbook (Platform PoC).docx"]
reviewed_at: 2026-07-28
review_by: 2026-10-26
---

# Platform PoC — Dispatch Guide / คู่มือคัดแยกเรื่องส่งต่อ

> **Rules for the AI assistant.** This file is loaded in Full Context. Use it to
> decide *which* workflow applies and *who owns* the next action, then retrieve
> the detailed SOP file for the steps. Never invent policy numbers.

## Scope / ขอบเขต

This collection covers **Platform Operations** — how ERISA's Creator Service team
works with the TikTok Shop platform through the **Platform PoC**. It is
**internal ERISA staff knowledge**, not creator-facing content.

Single point of contact for all platform questions: **AM (Platform PoC)**, who
is the same person as the **MCN Manager**.

Two main workstreams:

| Workstream | ครอบคลุม | Detail file |
|---|---|---|
| **Resolution (Violation Handling)** | การแก้ไขปัญหาที่เกี่ยวข้องกับแพลตฟอร์ม — ละเมิด LIVE/วิดีโอ, การยื่นอุทธรณ์, on-call | `resolution/01-violation-handling-workflow.md` |
| **Incentive (Policy, Mission, Voucher)** | Quarterly Mission, Monthly Campaign, Voucher Allocation | `incentive/01`–`incentive/04` |

## Dispatch table / ตารางคัดแยก

| ถ้าคำถามเกี่ยวกับ… | ไปที่ | Owner of next action |
|---|---|---|
| ครีเอเตอร์แจ้งโดนละเมิด LIVE / วิดีโอ | `resolution/01-violation-handling-workflow.md` | ERISA (คัดกรอง) → AM ถ้าเข้าเกณฑ์ |
| หา UID / Video ID / Live Room ID / Product ID | `resolution/02-evidence-and-identifiers.md` | ERISA |
| อุทธรณ์ได้ไหม / ดราฟต์คำโต้แย้ง | `resolution/01` Step 3 + Step 5 | ERISA |
| Mission รายไตรมาส, GO Live / Duration Challenge | `incentive/01-quarterly-platform-incentive.md` | Platform AM ประกาศ, ERISA สื่อสาร |
| Payday / Double Digit / คูปองแคมเปญรายเดือน | `incentive/02-monthly-campaign-incentive.md` | ERISA ยืนยันรายชื่อ, AM ตั้งค่า |
| จัดสรรงบคูปองเอง (MCN GMV Challenge budget) | `incentive/03-voucher-allocation.md` | ERISA วางแผน, AM ตั้งค่า |
| ใครเป็นคนจัดสรร reward ของ Mission รายไตรมาส | `incentive/01` Step 5 — **ERISA ไม่จัดสรร**, Platform กำหนดและระบบให้เอง | Platform |
| คิด Max Cap / AOV / จำนวนโควต้า | `incentive/04-max-cap-and-aov.md` | ERISA |
| ลิงก์ชีท, Lark, LINE OA, Partner Portal | `reference/01-channels-and-working-sheets.md` | ERISA |
| ศัพท์เฉพาะ (AM, PoC, CM, SKA, AOV, …) | `reference/02-platform-poc-glossary.md` | — |

## Latest-policy rule / กฎเรื่องนโยบายล่าสุด — READ THIS FIRST

**Policy, Mission conditions, discount rates, min spend, และ reward mechanics
เปลี่ยนทุกไตรมาสและทุกแคมเปญ.** Everything in this collection is a *process*
record with a **snapshot** of the conditions as of **Q3/2026**.

When answering any question that involves a specific number — discount %, min
spend, max cap, quota, sales threshold, coupon release time, mission target:

1. State the number **with its snapshot date** ("ตาม SOP Q3/2026 …").
2. Immediately add that the binding source is the **latest Platform AM
   announcement in Lark**, and that the responsible person must confirm with the
   AM (Platform PoC) before acting.
3. Never present a snapshot number as the current, confirmed condition.

The **process steps** (who does what, in what order, what the deliverable is)
are stable and can be stated directly. Only the **parameters** are volatile.

## Escalate — do not self-answer / ห้ามตอบเอง ต้องส่งต่อ

- Whether a specific violation case will pass appeal — always case by case,
  requires human review of the actual content.
- The current quota/remaining coupon count — **only the AM (Platform PoC) knows
  the real remaining number.**
- Voucher Code / Voucher ID — Platform AM does not issue these to ERISA at all.
- Anything about a creator who has a **Creator Manager (CM)** on the TikTok Shop
  side — ERISA cannot file on-call or allocate central-pool vouchers for them;
  ERISA can only coordinate and do a first-pass check.
- Any budget decision above the responsible person's authority — route to
  internal alignment + AM.

## Structural rules — stable, state directly / กฎเชิงโครงสร้าง

ข้อเหล่านี้เป็นเรื่อง **ขอบเขตหน้าที่และสิทธิ์** ไม่ใช่ตัวเลขเงื่อนไข จึงไม่เปลี่ยนตามไตรมาส:

- ERISA **ไม่มีสิทธิ์เข้าถึงระบบตั้งค่าคูปอง** — Platform AM ตั้งค่าให้เท่านั้น.
- Quarterly Mission: **ERISA ไม่จัดสรร reward** — Platform กำหนด และระบบให้เอง.
- ครีเอเตอร์ที่มี **CM** — ERISA ยื่น on-call ไม่ได้ และไม่อยู่ใน Voucher Pool กลาง.
- **เฉพาะ AM (Platform PoC)** ที่ทราบจำนวนคูปองคงเหลือจริง.
- Platform AM **ไม่ส่ง Voucher Code / Voucher ID** ให้ ERISA.

## Threshold snapshot (Q3/2026) — ห้ามตอบเป็นค่าปัจจุบัน

ทุกตัวเลขข้างล่างเป็น **snapshot ของ Q3/2026** และอยู่ภายใต้ *Latest-policy rule* ด้านบน:
ต้องระบุว่าเป็นค่า ณ Q3/2026 **และ** บอกให้ยืนยันกับประกาศล่าสุดของ AM (Platform PoC) ก่อนใช้งาน
เสมอ. **ห้ามตอบตัวเลขเหล่านี้ลอย ๆ ว่าเป็นเงื่อนไขปัจจุบัน.**

- รับเคสละเมิดเฉพาะที่เกิดขึ้น **ไม่เกิน 30 วัน**.
- ดราฟต์คำโต้แย้งต้อง **ไม่เกิน 300 ตัวอักษร**.
- คูปองจาก MCN incentive **ใช้ไม่ได้** กับสินค้าที่เข้าร่วม Brand Crazy Deal หรือ
  Flash Sales (ถือว่าลดซ้ำซ้อน).
- งบขั้นต่ำการออกคูปอง **100 USD** (ไม่ใช่บาท).
- เกณฑ์สิทธิ์ Voucher pool รายเดือน: ยอดขายแคมเปญก่อนหน้า **≥ 1,000 USD**
  (ไม่ใช่บาท).
- แจ้ง AM ตั้งค่าคูปองล่วงหน้า **2–3 วันทำการ**; ตัดรอบก่อน **17:00 น.** ถ้าเป็นงบในช่วงแคมเปญ.
