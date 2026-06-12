# Won't-fix: `metadata.actuals_source` whole-blob write (no jsonb merge)

**Status:** Won't-fix (decided 2026-06-12) — the race is not reachable in the real workflow
**Area:** `erify_api` fact-extraction / show + show-creator + show-platform actuals
**Origin:** WI-24 (erify_api hardening program) · **Decisions:** D8, D12 — resolved as won't-fix

## Context

The paired-actuals processors (`applyPairedShowActuals`, `applyPairedShowCreatorActuals`,
`applyPairedShowPlatformActuals`) record provenance in a JSONB
`metadata.actuals_source` map. They rebuild the **entire** map in memory
(`{ ...recordedSourceMap, ...changedKeys }`) and write it back via `updateShow` /
`updateActuals` — a read-modify-write of the whole blob. An untouched sibling key
survives via the in-memory spread, not a DB-level merge.

The theoretical **C1 race**: two *concurrent* transactions writing *different* keys
of the same target's `actuals_source` each read the old map, overlay their key, and
write the whole map — last write wins, dropping the other key.
`show_platforms.updatePerformanceMetric` avoids an analogous race with a single-key
`jsonb ||` merge + priority-in-predicate.

## Why won't-fix (not deferred)

WI-24's de-dup shipped (#177). The jsonb-merge half was originally deferred, then
**dropped** after a reachability check:

- **Actuals are recorded sequentially across operational phases** (pre-prod →
  on-air → post-prod), and a single paired submission writes both start+end in one
  `@Transactional`. There is no real flow that issues two concurrent writes to
  *different* `actuals_source` keys on the *same* target.
- The same-key cross-task case is already pre-filtered by the collision guard, and
  per-target transactions serialize the rest.
- So the whole-blob write is **correct for sequential writes**; the jsonb merge would
  add raw-SQL complexity and a correctness-bearing rewrite to fix a race the system
  cannot hit.

`actuals_source` itself is **provenance**, not a duplicate of the actual time. It
powers (a) the cost-summary display label in `studio-costs.service` and (b) the
sequential **override-protection** priority in the extractors (`canResolverOverwrite`
— a later lower-priority write can't clobber a MANAGER / post-production value). That
priority is sequential ordering — a real, working feature, distinct from the
concurrency race — and is unaffected by this decision.

## Revisit only if

- Concurrent writes to the **same** target's actuals become possible (e.g. multiple
  operator surfaces writing one show/creator/platform's actuals simultaneously), or
- A future design removes the operational-phase sequencing.

If revisited, mirror `updatePerformanceMetric`: a single-key `jsonb_set(… || jsonb_build_object(…))`
merge, with the source-priority guard moved into the UPDATE predicate (D8/D12).

## Related

- The whole-blob behavior is pinned by `fact-extraction.processor.spec.ts` (WI-T5,
  #172) — keep that characterization; it documents the current (intended) behavior.
