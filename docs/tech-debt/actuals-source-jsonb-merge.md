# Deferred: converge `metadata.actuals_source` onto a single-key jsonb merge

**Status:** Deferred (the WI-24 de-dup shipped; this is the remaining half)
**Area:** `erify_api` fact-extraction / show + show-creator + show-platform actuals
**Origin:** WI-24 (erify_api hardening program) · **Decisions:** D8, D12

## Context

The paired-actuals processors (`applyPairedShowActuals`, `applyPairedShowCreatorActuals`,
`applyPairedShowPlatformActuals`) record provenance in a JSONB
`metadata.actuals_source` map. They rebuild the **entire** map in memory
(`{ ...recordedSourceMap, ...changedKeys }`) and write it back via `updateShow` /
`updateActuals` — a read-modify-write of the whole blob. An untouched sibling key
survives only because of the in-memory spread, not a DB-level merge.

This is the **C1 race**: two concurrent transactions writing *different* keys of
`actuals_source` each read the old map, overlay their key, and write the whole
map — last write wins, dropping the other transaction's key.

`show_platforms.updatePerformanceMetric` already uses the race-free pattern: a
single-key `jsonb ||` merge evaluated against the row's current value (see that
method's doc comment, Codex P1 on PR #132).

## What WI-24 shipped vs deferred

- **Shipped:** de-duplicated the three `tryAtomicPaired*` routers — the creator
  and platform per-target routers collapsed into one generic
  `tryAtomicPairedPerTargetActuals`; the show router stays separate (single-target
  shape). Behavior-preserving, protected by the paired routing + processor specs.
- **Deferred (this note):** migrating the `actuals_source` whole-blob write to a
  single-key `jsonb ||` merge in `show.service.updateShow` (and the creator /
  platform `updateActuals` equivalents), matching `updatePerformanceMetric`.

## Current behavior is pinned

`fact-extraction.processor.spec.ts` (WI-T5, #172) characterizes the whole-blob
write: a partial paired write rewrites the full `actuals_source` map, and the
untouched sibling survives via the spread. When the jsonb-merge lands, that test
flips from "full map rewritten (sibling preserved by spread)" to "only the
changed key merged (sibling preserved at the DB level)" — the *outcome* (sibling
survives) holds; the mechanism changes.

## Decisions to resolve when picking this up

- **D8** — jsonb-merge convergence timing (now confirmed as its own PR) and shape.
- **D12** — collision precedence: how a single-key merge interacts with the
  cross-task `(factKey, target)` collision routing and the priority guard.

## Risk if left

Low-frequency: requires two concurrent task submissions writing *different*
actuals keys on the *same* target within the read-write window. The collision
pre-filter and the per-target transaction boundaries already serialize the common
cases; the residual race is the cross-key whole-blob overwrite described above.
