---
id: erisa-platform-ops.max-cap-and-aov
title: Setting Max Cap from AOV
audiences: [erisa]
owner: erisa-creator-services
sensitivity: department
status: active
tags: [max-cap, aov, quota, voucher, budget, calculation, platform-poc]
source_refs: ["ERISA_SOP_Platform Playbook (Platform PoC).docx § 2 การคิด max cap (การดูจาก AOV)"]
reviewed_at: 2026-07-28
review_by: 2026-10-26
---

# การคิด Max Cap จาก AOV / Setting Max Cap from AOV

**Snapshot: Q3/2026.** Discount rate และ min spend เปลี่ยนไปแต่ละช่วง — ยืนยันกับ AM ก่อนคำนวณจริง.

## นิยาม

**AOV (Average Order Value)** = ยอดขายเฉลี่ยต่อออเดอร์

```text
AOV = GMV ÷ จำนวนออเดอร์ที่ขายได้
```

## ทำไม Max Cap ถึงสำคัญ

งบประมาณในการทำคูปองมีจำกัด และ **จำนวนใบของคูปองขึ้นอยู่กับ Max Cap ที่กำหนด**:

```text
จำนวนใบ (Quota) ≈ Budget ÷ Max Cap
```

Max Cap ต่ำ → ได้จำนวนใบมากขึ้นจากงบเท่าเดิม
Max Cap สูง → ส่วนลดต่อใบเยอะขึ้น แต่ได้จำนวนใบน้อยลง

จึงต้อง **อิง Max Cap กับ AOV ของช่อง** — ถ้า Max Cap สูงเกิน AOV จริงของช่อง
งบจะถูกใช้หมดเร็วโดยไม่ได้เพิ่มจำนวนออเดอร์ตามที่ควร.

## ตัวอย่างการคำนวณ — ช่องตัวอย่าง `@example_creator`

| รายการ | ค่า |
|---|---|
| ยอดขายย้อนหลัง 30 วัน | ฿4,120,000 |
| จำนวนออเดอร์ | 20,000 |
| **AOV** | **≈ ฿206** |
| เงื่อนไขคูปองในแคมเปญนี้ | ขั้นต่ำ 199.- , discount rate 18% |
| **Max Cap ที่กำหนด** | **฿45** |

**เหตุผล:** ครีเอเตอร์ขายสินค้าเฉลี่ยต่อออเดอร์ละ ฿206 และเราต้องการ **โควต้าจำนวนใบที่มากขึ้น**
จึงกำหนด Max Cap ที่ ฿45 เป็นส่วนลดให้กับทางช่อง.

> ⚠️ เงื่อนไข discount rate 18% และ min spend 199.- เป็น snapshot ของแคมเปญนั้น —
> **เงื่อนไขเปลี่ยนไปแต่ละช่วง**.

## กรณีคูปองรวมหลายช่อง

หากออกเป็น **คูปองรวมใช้ได้หลายช่อง** ให้ดู **ค่าเฉลี่ย AOV ของหลายช่อง**
เพื่อกำหนด Max Cap ให้เหมาะสม.

## Checklist ก่อนกำหนด Max Cap

1. ดึง GMV และจำนวนออเดอร์ย้อนหลัง 30 วันของช่อง (Partner Portal)
2. คำนวณ AOV = GMV ÷ ออเดอร์
3. ยืนยัน discount rate และ min spend ล่าสุดกับ AM (Platform PoC)
4. ตั้ง Max Cap ให้สอดคล้องกับ AOV และเป้าหมายจำนวนใบ
5. ประมาณ Quota = Budget ÷ Max Cap แล้วตรวจว่าพอกับระยะเวลาแคมเปญ
6. ตรวจว่างบรวม **≥ 100 USD** (งบขั้นต่ำการออกคูปอง)
