# ERISA Platform Ops Knowledge — Platform PoC (Internal)

Git-authored source knowledge for **ERISA Creator Service — Platform Operations**:
how the team works with the TikTok Shop platform through the **Platform PoC** for
violation resolution and incentive/voucher management.

**Collection:** `erisa-platform-ops-sop` (Open WebUI).

> ⚠️ **Internal staff knowledge — not creator-facing.** This collection contains
> internal escalation thresholds, budget-allocation logic, AM messaging templates,
> Lark working-sheet links, and worked examples with real creator handles, UIDs
> and GMV figures. It must **not** be attached to `creator-service-assistant`
> (the creator-facing assistant) or to any assistant whose audience includes
> creators. Attach only to an ERISA-internal assistant.

## Source

Hand-authored from `ERISA_SOP_Platform Playbook (Platform PoC).docx`
(created by Katsaraporn Yoosin (Kat), Department: Creator Service (ERISA),
Function: Platform PoC, Responsibility: Talent Enablement Specialist,
content updated Q3/2026).

Unlike [`../creator-services/`](../creator-services/), these files are **not**
generated artifacts — there is no Excel source and no `generate_kb.py` step.
Edit the Markdown directly, then re-upload. When the source `.docx` is revised,
re-derive the affected files by hand and bump `reviewed_at`.

**Every identifier, figure and URL in this collection is synthetic. Nothing
here is a real creator, order value, or internal link.**

This repository is **public**, so Open WebUI access grants protect nothing
committed to it. Handles are `@example_creator`; IDs use reserved-looking
`7000…`/`1700…` patterns that cannot collide with real ones; the Working Sheet
row points at the AM instead of carrying a link. Stand-ins were chosen to keep
the arithmetic intact — the AOV example still divides to `฿206`, so the Max Cap
reasoning is unchanged.

When following a procedure, take real values from the CRM, Partner Portal and
Working Sheet. **Never re-introduce a real identifier into this directory.**

The source `.docx` is **not committed** (same platform-confidentiality rule as
`creator-services/`: see [`../../synced/skills/creator-management.md`](../../synced/skills/creator-management.md)).
The 21 embedded screenshots and three workflow diagrams
(`Violation Handling Workflow.png`, `Incentive Management: End-to-End Loop
(Overview).png`, `Incentive Management: Voucher Allocation`) are likewise not
committed — they are platform UI captures. Files reference them by name only.

## Contents (9 content files + this README)

| Path | What it holds |
|---|---|
| `00-platform-poc-dispatch.md` | Dispatch table, the latest-policy rule, escalation list, hard constraints — **attach as Full Context** |
| `resolution/01-violation-handling-workflow.md` | 7-step violation workflow, appealability triage, AM/on-call templates, 300-char rebuttal drafts |
| `resolution/02-evidence-and-identifiers.md` | UID / Handle / Video ID / Live Room ID / Product ID — what they are and how to find each |
| `incentive/01-quarterly-platform-incentive.md` | 10-step quarterly Mission loop (GO Live / Duration Challenge), announcement templates |
| `incentive/02-monthly-campaign-incentive.md` | 10-step monthly Campaign loop (Payday, Double Digit), eligibility checklist, CM exclusion |
| `incentive/03-voucher-allocation.md` | 8-step MCN-budgeted voucher flow, setup fields, monitoring, under-redemption rule |
| `incentive/04-max-cap-and-aov.md` | Max Cap ← AOV calculation with worked example |
| `reference/01-channels-and-working-sheets.md` | Lark, Working Sheet tabs, CRM, Partner Portal, LINE OA genre channels |
| `reference/02-platform-poc-glossary.md` | SOP-scoped glossary (AM, CM, PoC, AOV, Max Cap, Quota, …) |

## The latest-policy contract

This is the single most important behavioral rule for any assistant serving this
collection, and it is why the `platform-incentive-dispatch` skill exists:

- **Process steps are stable** — who does what, in what order, what the deliverable
  is. State these directly.
- **Parameters are volatile** — discount %, min spend, max cap, quota, sales
  thresholds, coupon release times, mission targets. Every number here is a
  **Q3/2026 snapshot**. State it with its snapshot date and route the user to
  confirm against the latest Platform AM announcement in Lark before acting.

Never present a snapshot number as a confirmed current condition.

## Open WebUI deployment

1. **Create + upload in one pass** with
   [`../../../../scripts/ai/creator-kb/upload_kb.py`](../../../../scripts/ai/creator-kb/upload_kb.py)
   pointed at this directory. `--description` is required here: the script's
   default description is the creator-services one, and description is a
   retrieval surface (`query_knowledge_bases` matches on name + description),
   so an unset description makes this collection route badly.

   ```bash
   set -a; . ai/openwebui/.env; set +a
   python3 scripts/ai/creator-kb/upload_kb.py \
     --kb-name erisa-platform-ops-sop \
     --dir ai/openwebui/knowledge/erisa-platform-ops \
     --description "ERISA internal Platform PoC operations SOP (Thai-primary): \
   TikTok Shop violation handling and appeals, quarterly Mission incentives, \
   monthly campaign vouchers (Payday, Double Digit), MCN voucher allocation, \
   max cap and AOV calculation, Platform AM coordination. Internal staff only."
   ```

   The script reconciles by content hash, so re-running after an edit reflects
   Git. It skips `README.md`, so this file is not uploaded.

   **Upload path, as verified on this deployment.** The script sends
   `knowledge_id` (and `directory_id`) in the upload metadata so the server
   links and processes each file itself, then polls
   `/files/{id}/process/status`, and falls back to
   `POST /api/v1/knowledge/{id}/file/add` only if the server ignored the
   metadata link. That metadata path **worked** here: the run created the
   `incentive/`, `reference/` and `resolution/` directories server-side and
   attached 9/9 files. Do not "fix" the script to drop the metadata — an
   older note warning against `metadata.knowledge_id` does not describe this
   build, and following it would disable the mechanism that actually works.

2. **Verify** — `GET /api/v1/knowledge/{id}/files` → `total` should be **9**,
   names unique and 1:1 with the local `.md` files (excluding `README.md`).
3. **Access grants are derived, not set by hand.** `upload_kb.py` reads each
   file's `audiences`, maps them through
   [`../../access/audience-group-map.json`](../../access/audience-group-map.json)
   to live Open WebUI groups, and applies the result. It **refuses to publish**
   — before uploading anything — when the map is unapproved, an audience is
   unmapped, a mapped group is missing on the instance, or the derivation would
   yield no grants. It then reads the grants back and fails if they are empty.

   That map is currently **unapproved**, so this collection cannot be published
   until the content owner signs off on the audience → group mapping. See
   [`../../../../docs/tech-debt/erisa-platform-ops-manual-access-grants.md`](../../../../docs/tech-debt/erisa-platform-ops-manual-access-grants.md).
4. **Attach to an ERISA-internal assistant** in the UI (the UI sets
   `meta.knowledge[].type = "collection"`; a raw API attach that omits it makes
   retrieval silently skip the collection). Attach `00-platform-poc-dispatch.md`
   additionally as a **Full Context** item.
5. **Attach the skill** [`../../skills/platform-incentive-dispatch.md`](../../skills/platform-incentive-dispatch.md).
6. **Snapshot back to the repo** — `python3 ai/openwebui/pull_config.py`, then commit.

Retrieval settings are global and already correct for Thai content
(`RAG_EMBEDDING_MODEL=BAAI/bge-m3`, hybrid on, reranker `bge-reranker-v2-m3`,
`TOP_K=10`, `TOP_K_RERANKER=3`). Do not change them for this collection —
embedding is global and changing it invalidates every collection's vectors.

## Governance

Every content file carries the Content Contract frontmatter from
[`../../../architecture/llm-knowledge-base-plan.md`](../../../architecture/llm-knowledge-base-plan.md)
§ Content Contract: `id`, `title`, `audiences: [erisa]`,
`owner: erisa-creator-services`, `sensitivity: department`, `status: active`,
`tags`, `source_refs`, `reviewed_at`, `review_by`.

**This collection has no grant-derivation and is NOT covered by an approved
exception.** Its Open WebUI access grants are set by hand, not derived from the
frontmatter above. The pilot-gated exception in
`ai/architecture/llm-knowledge-base-plan.md` § Content Contract is scoped to
`creator-services-tiktok-shop` **only**; it does not extend here, and this
README does not extend it. Widening that exception would be a doctrine change
and would have to go through the repository's pattern/direction reconciliation
gate in `AGENTS.md`, not through a collection README.

So this is an **open governance gap**, tracked at
[`../../../../docs/tech-debt/erisa-platform-ops-manual-access-grants.md`](../../../../docs/tech-debt/erisa-platform-ops-manual-access-grants.md).
The gap is not theoretical: on first deployment the collection was created
with **no grants at all** — unrestricted on this build — and had to be
corrected by hand afterwards. Until derivation exists, whoever deploys or
re-uploads this collection must verify grants immediately after every run.

`sensitivity: department` (Erisa pillar only) is deliberate: the content is
operational rather than leadership-restricted, but it must not reach Commerce,
Erify, or creators.

## Validation questions

Known-answer checks after deployment:

1. `ครีเอเตอร์โดนละเมิดไลฟ์ ต้องส่งข้อมูลอะไรบ้าง` → Step 1 template, 30-day limit
2. `หา Live Room ID ยังไง` → Partner Portal + timestamp (`resolution/02`)
3. `เกณฑ์ครีเอเตอร์ที่ได้ voucher pool รายเดือนคืออะไร` → ≥ 1,000 USD ยอดขายแคมเปญก่อนหน้า, ยังเชื่อมโยง MCN, ไม่มี CM
4. `คิด max cap ยังไง` → AOV = GMV ÷ orders, worked example ฿206 → cap ฿45
5. `คูปองใช้ไปแค่ 30% ทำยังไง` → under-redemption rule: ยกเลิก+ตั้งใหม่ หรือเพิ่มรายชื่อ burn
6. `discount rate ตอนนี้เท่าไหร่` → must answer with the Q3/2026 snapshot **and**
   route to the latest Platform AM announcement (tests the latest-policy contract)
7. `ERISA จัดสรร reward ของ Quarterly Mission เองไหม` → ไม่ — Platform กำหนดและระบบให้เอง
