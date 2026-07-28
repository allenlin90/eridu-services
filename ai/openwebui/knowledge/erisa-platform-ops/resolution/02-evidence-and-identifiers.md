---
id: erisa-platform-ops.evidence-and-identifiers
title: Evidence and Platform Identifiers (UID, Video ID, Live Room ID, Product ID)
audiences: [erisa]
owner: erisa-creator-services
sensitivity: department
status: active
tags: [uid, video-id, live-room-id, product-id, evidence, violation, platform-poc]
source_refs: ["ERISA_SOP_Platform Playbook (Platform PoC).docx § 1 Step 4"]
reviewed_at: 2026-07-28
review_by: 2026-10-26
---

# หลักฐานและรหัสระบุตัวตน / Evidence and Platform Identifiers

ใช้เมื่อรวบรวมหลักฐานเพื่อประสานงานกับแพลตฟอร์ม (Violation Handling Step 4).

## รายการข้อมูลที่จำเป็น / Required fields

| หัวข้อข้อมูลที่จำเป็น | คืออะไร? อย่างไร? |
|---|---|
| **UID** (Unique Identifier) | รหัสระบุตัวตนเฉพาะบุคคล/บัญชีผู้ใช้งานในระบบดิจิทัล สร้างขึ้นแบบไม่ซ้ำกับใคร เปรียบเสมือน "เลขบัตรประจำตัวประชาชน" **เปลี่ยนไม่ได้ แม้ Handle เปลี่ยน** — สำคัญมากสำหรับระบุช่องของครีเอเตอร์ |
| **Handle** | Username ของครีเอเตอร์ เช่น `@username` — **เปลี่ยนได้** |
| **Issue Type** | ประเภทปัญหา Violation, ช่องทาง (ไลฟ์ หรือ วิดีโอ) |
| **explained issue** | อธิบายปัญหาอย่างละเอียด |
| **Video link** | มี 2 format:<br>• ลิงก์แชร์จาก app โดยตรง `https://vt.tiktok.com/XXXXXXXXX/`<br>• ลิงก์แชร์จาก PC — **ควรใช้ format นี้ในการคุยกับแพลตฟอร์ม** `https://www.tiktok.com/@<handle>/video/<video-id>` |
| **Video ID** | ID ของวิดีโอแต่ละวิดีโอ |
| **Live Room ID** | ID ของห้องไลฟ์แต่ละ Session |
| **Product ID** | ID ของสินค้า |
| **Screenshots** (วิดีโอ, รูปภาพ) | รวบรวมเนื้อหาของคอนเทนต์เพื่อประกอบการยื่น on-call / appeal |

## ทำไมต้องใช้เลข ID ไม่ใช่ลิงก์แชร์จากแอป

ลิงก์ format `https://vt.tiktok.com/XXXXXXXXX/` มักเป็น **ลิงก์ชั่วคราว มีวันหมดอายุ**
เมื่อกดเข้าอาจ redirect ไปไม่ถูกต้อง. และ **ทีม Internal ของ TikTok ค้นหาข้อมูลผ่าน ID**.
ดังนั้นต้องใส่ข้อมูลให้ถูกตาม format เพื่อสื่อสารกับแพลตฟอร์มอย่างมีประสิทธิภาพ.

## วิธีการหาแต่ละ ID

### UID

ค้นหาใน CRM โดยค้นจาก Handle ในไฟล์ **`EA_Creator CRM`**.
ถ้าไม่พบ แปลว่าทีมยังไม่ได้อัปเดต หรือครีเอเตอร์เปลี่ยน handle / `@username`.

### Video ID

1. เปิดลิงก์วิดีโอ (เช่น `https://vt.tiktok.com/ZSxxxxxxx/`) **บน PC**
2. จะได้ลิงก์แบบ `https://www.tiktok.com/@example_creator/video/7000000000000000001`
3. **Video ID คือส่วนท้าย** → `7000000000000000001`

### Live Room ID

1. ต้องรู้ **Timestamp** จากครีเอเตอร์เพื่อระบุ Live session
2. ค้นหาใน **MCN Partner Portal**
3. ตัวอย่าง: ช่อง `@example_creator` มีละเมิดในไลฟ์วันที่ `Jan 15, 2026 10:00 PM`
   → Live Room ID = `7000000000000000002`

### Product ID

วิธีคล้ายกับ Video ID:

1. เปิดลิงก์สินค้า (เช่น `https://vt.tiktok.com/ZSyyyyyyyyyyyyyyy/`) **บน PC**
2. จะได้ลิงก์แบบ `https://shop.tiktok.com/th/pdp/1700000000000000003`
3. **Product ID** → `1700000000000000003`

## บันทึกผลลัพธ์

นำข้อมูลที่เก็บได้ใส่ใน Working Sheet → ชีท `CS_Service Ticket`
→ แท็บ `Creator Issue Tracking x TTS (Violation)`. **ใส่ทุกเคส** เพื่อบันทึกเป็น internal MCN
และใช้คัดกรองในขั้นตอนถัดไป.
