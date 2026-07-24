# Creator Services Knowledge — TikTok Shop (Thailand)

Git-authored source knowledge for the **Erisa Creator Service Assistant**
(`creator-service-assistant`) in Open WebUI. Thai-primary content (creators ask
in Thai) with English question translations and bilingual headers for retrieval.

This collection is the early, bootstrap realization of the `wiki-erisa` slot
in [`ai/architecture/llm-knowledge-base-plan.md`](../../../architecture/llm-knowledge-base-plan.md)'s
roadmap ("Erisa groups — Creator and affiliate workflows"), reached via this
directory's lighter pipeline instead of the full `company-wiki/` validator +
Sync Pipe. Every content file (not this README) carries that plan's Content
Contract frontmatter — `id`, `audiences: [erisa]`,
`owner: erisa-creator-services`, `sensitivity: department`, `status`,
`source_refs`, `reviewed_at`, `review_by`.

**Governance status — metadata only, not yet enforced.** This frontmatter is
descriptive, not functional: `generate_kb.py` does not validate it (no
`company-wiki/tools/validate-wiki`-equivalent exists for this collection yet),
and `upload_kb.py` does not read it or derive Open WebUI access grants from
it — the collection's real access grants (`ai/openwebui/synced/models.json`
→ `creator-service-assistant` → `access_grants`) are set and maintained
manually and are the actual source of truth for who can reach this content
today, independent of what `audiences`/`sensitivity` say. Before changing who
can access this collection, update the grants directly in Open WebUI (or via
`POST /api/v1/knowledge/{id}/access/update`), not by editing frontmatter.
Building frontmatter validation and grant derivation (or folding this
collection onto `company-wiki/tools/validate-wiki`) is the remaining gap
before this counts as fully governed per the plan.

Generated from `CS_TikTok_Shop__Knowledge_Base.xlsx` (Phase 1 one-time snapshot —
no TikTok Academy scraping yet) via
[`../../../../scripts/ai/creator-kb/generate_kb.py`](../../../../scripts/ai/creator-kb/generate_kb.py).
The source Excel is **not** committed (see Confidentiality below).

## Contents (28 files, 348 entries)

| Path | What it holds |
|---|---|
| `00-escalation-guide.md` | Topics the assistant must never self-answer — always route to admin |
| `faq/` (18 files) | Core creator FAQ, one file per sub-category (account setup, products, payments, troubleshooting, policies, campaigns) |
| `policy/` (7 files) | Q1/2025 creator policy Q&A by topic (RS Tier, rebates, SV/LS Challenge, ACA, Live Base, …) |
| `violations/common-violations.md` | Violation types, appeal evidence, prevention, penalties |
| `terminology/glossary.md` | EN/TH glossary of creator tiers and platform jargon |

Answer types inside the FAQ: **108 full answers**, **88 link references** (source
Excel pointed to a TikTok Shop Academy article without inlining it — Phase 2 will
scrape and inline these), **6 escalations** (mirrored in `00-escalation-guide.md`).

## Open WebUI deployment

- **Collection:** `creator-services-tiktok-shop` (live id `8fa78477-cf8a-4fbb-b9d3-fb86a0bc24fb`).
- **Model attachment:** attach the collection to `creator-service-assistant` on
  **Focused Retrieval** (default). ALSO attach `00-escalation-guide.md` as a
  standalone item in **Full Context** mode so escalation rules are always injected
  and never depend on the model choosing to retrieve them.
- **Retrieval settings (global, Admin → Settings → Documents):** `Top K = 10`,
  **Hybrid Search on** with reranker `BAAI/bge-reranker-v2-m3`, relevance
  threshold `0`. Hybrid Search is required so the exact-heading match in
  `faq/05` (the day-8 commission settlement rule) out-ranks the adjacent `faq/07`
  payout chunks; pure semantic search at low Top K misses it.

## Sync pipeline

- **Bootstrap / PoC:** [`../../../../scripts/ai/creator-kb/upload_kb.py`](../../../../scripts/ai/creator-kb/upload_kb.py)
  creates the collection and uploads every file. This copy is **reconciled for the
  deployed Open WebUI `0.10.x`**: the list endpoint returns `{"items": [...]}`
  (not a bare list), it reads `OPEN_WEBUI_HOST` / `OPEN_WEBUI_API_KEY` from
  `ai/openwebui/.env`, and it skips hidden dirs / `site-packages`. It reconciles
  by content hash (own `content_sha256` upload metadata, not filename presence):
  unchanged files are skipped, changed files are deleted and re-uploaded, and KB
  files with no matching local filename are removed — so re-running it after a
  regeneration reflects Git, not whatever ran first.
- **Long-term:** move sync to the repo's knowledge Sync Pipe (or `oikb`) pointed
  at this directory, matching how `company-wiki/` is kept in sync.

## Regenerating

```bash
python3 scripts/ai/creator-kb/generate_kb.py <new-excel>.xlsx ai/openwebui/knowledge/creator-services
```

Knowledge `.md` files are **generated artifacts** — do not hand-edit content here;
change the source Excel and regenerate, then re-run `upload_kb.py`; it reconciles
changed/removed files automatically (see Sync pipeline above), no manual cleanup
step needed.

## Validation questions

Known-answer checks for the assistant (see the package `README.md` for full detail):

1. `ถอนเงินค่าคอมได้เมื่อไหร่` → day-8 settlement rule (`faq/05`)
2. `ขอตัวอย่างฟรียังไง` → 4-step flow + posting deadlines (`faq/02`)
3. `โดนแบนถาวรแต่ไม่ได้ทำผิด ทำไงดี` → must **escalate** (`00-escalation-guide.md`)
4. `RS Tier ตัดยอดวันไหน` → 26th-of-prior-month cutoff (`policy/01-rs-tier`)
5. `SKA คืออะไร` → creator with sales >600K (`terminology/glossary`)

## Confidentiality

Per the platform-confidentiality rule in
[`../../synced/skills/creator-management.md`](../../synced/skills/creator-management.md),
the source Excel (`CS_TikTok_Shop__Knowledge_Base.xlsx`) is not committed. If it
must be versioned, keep it in restricted storage and record its location +
snapshot date in the PR description. Phase 2 scraped TikTok Academy content is
TikTok's published material and belongs in a **separate** collection
(`tiktok-academy-articles`), not this one.
