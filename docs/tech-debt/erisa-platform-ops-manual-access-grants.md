# Audience → Open WebUI group mapping is only defined for ERISA

## Affected surface

- `ai/openwebui/access/audience-group-map.json` (approved for ERISA only)
- `scripts/ai/creator-kb/upload_kb.py`
- `ai/openwebui/knowledge/erisa-platform-ops/` (collection `erisa-platform-ops-sop`)
- `ai/architecture/llm-knowledge-base-plan.md` § Content Contract, Phase 0

## Current behavior

Grants are now **derived**, satisfying the plan's requirement that they come from
validated `audiences` metadata. `upload_kb.py` validates each file's governance
metadata, permits only `active` documents, resolves `audiences` through
`ai/openwebui/access/audience-group-map.json`, rejects wildcard grants, applies
the result, and requires exact grant-set equality before and after upload. The
manual exception path likewise requires the collection to exist and match its
reviewed grant set before and after upload. A refusal therefore cannot leave a
half-published, ungranted, or accidentally widened collection.

`erisa-platform-ops-sop` publishes cleanly under this gate. Its derived grants
(`Erisa - Creator` read; `Admins` read + write) are byte-identical to the grants
it previously carried by hand, so adopting derivation changed nobody's access.

**Three gaps remain. All are deliberate; the first two fail closed.**

**1. Only ERISA is mapped.** `commerce-*`, `erify-*`, `finance-manager` and
`hr-manager` have no entries, because no owner has decided how the tier-shaped
vocabulary lands on the function-shaped live groups:

| Vocabulary | Live groups | Mapped? |
| --- | --- | --- |
| `erisa-member`, `erisa-team-lead`, `erisa-manager` | `Erisa - Creator`, `Erisa - Campaign` | Yes — to `Erisa - Creator` only |
| `commerce-member`, `commerce-team-lead`, `commerce-manager` | `Commerce - Operation`, `Commerce - Sales` | No |
| `erify-member`, `erify-team-lead`, `erify-manager` | `Erify - Onset`, `Erify - Offset` | No |
| `finance-manager`, `hr-manager` | `Finance - Manager`, `HR - Manager` | No |
| — (no entry) | `Management team` | n/a |

Any collection whose audiences touch an unmapped group is refused publication.

**2. ERISA maps to Creator only, not Campaign.** This reproduces the existing
grants rather than widening them. The SOP does cover campaign incentive work, so
extending to `Erisa - Campaign` is defensible — but it is a widening and has to
be an explicit edit to the map.

**3. `org-general`'s automatic grant is suspended, not decided.** The schema
used to say it applied to every collection "regardless of sensitivity", which
contradicted the sensitivity ladder in the same file — `department` means "one
pillar only", `restricted` means "named leadership groups only", and only
`internal` is defined as reaching org-general.

Rather than substitute a scope nobody had chosen, the automatic grant was
withdrawn entirely and the question left open. Every surface now says the same
thing (no automatic grant), so there is no longer a contradiction — but there is
also no policy. The GM currently receives access only where granted explicitly
on a collection.

Nothing was lost in the withdrawal: the rule had never been implemented.
`validate-wiki`'s `expandAudiences` only ever expanded a document's own
`audiences`, so no collection had ever received `org-general` this way.

## Risk

Medium, and currently **mitigated by the gate refusing to publish**. Before the
gate existed, the collection was created with no grants at all — unrestricted on
Open WebUI `0.10.x` — and was corrected by hand afterwards. That class of failure
is what the derivation prevents.

The residual risk is scope creep in the mapping: because the vocabulary is
coarser than the instance's groups, an approved mapping may grant more broadly
than a document author intends. Sensitivity-aware narrowing is not implemented.

## Trigger to fix

Per gap, all trigger-gated rather than immediate:

1. **Other pillars** — when a collection with non-ERISA audiences is first
   published. It will be refused until an owner adds the entries.
2. **Campaign access** — when the Campaign team needs Platform PoC content.
3. **`org-general`'s scope** — when the GM actually needs a collection they
   cannot currently reach, or at the next Content Contract review. Options are
   automatic on `public`/`internal` only, automatic everywhere with the
   sensitivity tiers reworded to acknowledge a standing GM exception, or
   permanently explicit-per-collection (the current de-facto state). The
   `sensitivity_scoped_read` mechanism in `audience-group-map.json` is retained
   and empty, ready to carry whichever scope is chosen.
Separately, the derivation this PR adds is what the
`creator-services-tiktok-shop` exception gate has been waiting on; that gate can
lift once someone confirms the mapping covers that collection's audiences too.
