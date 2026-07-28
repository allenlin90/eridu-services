# ERISA Platform Ops collection has manual, underived access grants

## Affected surface

- `ai/openwebui/knowledge/erisa-platform-ops/` (collection `erisa-platform-ops-sop`)
- `scripts/ai/creator-kb/upload_kb.py`
- `ai/architecture/llm-knowledge-base-plan.md` § Content Contract

## Current behavior

Every file in the collection carries Content Contract frontmatter
(`audiences: [erisa]`, `sensitivity: department`), but nothing reads it.
`upload_kb.py` does not validate the frontmatter and does not derive Open WebUI
`access_grants` from `audiences`. The collection's real access control is set by
hand after upload and is the only thing protecting it.

This is **not** covered by an approved exception. The pilot-gated exception in
`ai/architecture/llm-knowledge-base-plan.md` § Content Contract is scoped to
`creator-services-tiktok-shop` only.

The failure mode is demonstrated, not hypothetical. On first deployment
(2026-07-28) the collection was created with **no `access_grants` at all**,
which on Open WebUI `0.10.x` means unrestricted, and stayed that way until the
grants were corrected by hand in a follow-up call.

## Desired behavior

`upload_kb.py` derives `access_grants` from each file's `audiences` via the
group mapping in `ai/openwebui/knowledge/company-wiki/tools/wiki-schema.json`,
applies them with `POST /api/v1/knowledge/{id}/access/update`, rejects wildcard
and public grants, and fails the run when a file's metadata has no valid group
mapping. Alternatively the collection migrates onto
`company-wiki/tools/validate-wiki` and the Sync Pipe.

Either route removes the manual step; neither should be reached by widening the
`creator-services-tiktok-shop` exception through a collection README.

## Risk

Medium. The content is `sensitivity: department` (Erisa pillar only) and
includes voucher budget logic, escalation thresholds and Platform AM
coordination detail. A future re-upload, a new collection created from the same
script, or a restore that recreates the KB will again produce an unrestricted
collection unless a human remembers to re-apply grants.

## Trigger to fix

Any of:

- a third collection is added to `upload_kb.py`'s remit (two is already enough
  to make the manual step a pattern rather than a one-off);
- the `creator-services-tiktok-shop` exception gate lifts, since the derivation
  work that closes it also closes this;
- this collection's `audiences` or `sensitivity` needs to change, since there is
  currently no mechanism that would propagate the change to live grants.

Until then: verify grants immediately after every upload run. `upload_kb.py`
prints this as a closing step.
