# Audience → Open WebUI group mapping is undefined, blocking derived access grants

## Affected surface

- `ai/openwebui/access/audience-group-map.json` (new, unapproved)
- `scripts/ai/creator-kb/upload_kb.py`
- `ai/openwebui/knowledge/erisa-platform-ops/` (collection `erisa-platform-ops-sop`)
- `ai/architecture/llm-knowledge-base-plan.md` § Content Contract, Phase 0

## Current behavior

`llm-knowledge-base-plan.md` requires that collection membership and access
grants be **derived** from validated `audiences`/`sensitivity` metadata, and that
"a document cannot be published when its metadata has no valid collection and
group mapping."

The derivation mechanism now exists: `upload_kb.py` validates each file's
governance metadata, refuses `draft`/`archived`, resolves `audiences` through
`ai/openwebui/access/audience-group-map.json`, rejects wildcard grants, applies
the result via `POST /api/v1/knowledge/{id}/access/update`, and reads the grants
back to confirm they are non-empty. Every failure raises **before** any file is
uploaded, so a refusal cannot leave a half-published, ungranted collection.

**What is missing is the mapping itself**, and it is missing repo-wide, not just
for this collection. Phase 0 of the plan lists "Define the audience and
sensitivity vocabulary and its exact Open WebUI group mapping" as an open item.
The two vocabularies do not line up:

| Content Contract vocabulary | Live Open WebUI groups |
| --- | --- |
| `erisa-member`, `erisa-team-lead`, `erisa-manager` (tier-shaped) | `Erisa - Creator`, `Erisa - Campaign` (function-shaped) |
| `commerce-member`, `commerce-team-lead`, `commerce-manager` | `Commerce - Operation`, `Commerce - Sales` |
| `erify-member`, `erify-team-lead`, `erify-manager` | `Erify - Onset`, `Erify - Offset` |
| — (no entry) | `Management team` |

Because no tier group exists on the instance, `audiences: [erisa]` resolves to
nothing, and the gate correctly refuses to publish. `audience-group-map.json`
therefore ships with `status: UNAPPROVED` and empty tables, with a candidate
mapping parked under `$proposed` that the script deliberately ignores.

This is not a `creator-services-tiktok-shop`-style exception. That collection has
a scoped, recorded exception; this collection has none and claims none. It simply
cannot be published until the mapping is approved.

## Desired behavior

The content owner settles three questions and the mapping moves from `$proposed`
into `audiences`/`automatic` with `status: approved`:

1. **Tier → team.** Mapping all three ERISA tiers onto both ERISA teams means
   `audiences: [erisa]` reaches Campaign as well as Creator. Defensible for this
   SOP, which covers campaign incentive work — but it is a widening and needs to
   be stated, not inferred.
2. **`Org - General`.** `wiki-schema.json` says org-general (the GM, read-only)
   is granted automatically on every collection *regardless of sensitivity*.
   Applied literally that gives the GM read on department-confidential Platform
   PoC content. Confirm or carve out.
3. **`Management team`** exists live with no vocabulary entry.

Then `upload_kb.py --kb-name erisa-platform-ops-sop …` publishes with derived
grants and no manual step.

## Risk

Medium, and currently **mitigated by the gate refusing to publish**. Before the
gate existed, the collection was created with no grants at all — unrestricted on
Open WebUI `0.10.x` — and was corrected by hand afterwards. That class of failure
is what the derivation prevents.

The residual risk is scope creep in the mapping: because the vocabulary is
coarser than the instance's groups, an approved mapping may grant more broadly
than a document author intends. Sensitivity-aware narrowing is not implemented.

## Trigger to fix

Immediate — this blocks publishing `erisa-platform-ops-sop` at all. Beyond that,
the same mapping unblocks the `creator-services-tiktok-shop` exception gate,
since derivation is exactly what that gate waits on.
