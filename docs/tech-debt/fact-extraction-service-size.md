# Tech Debt: `fact-extraction.service.ts` exceeds the backend file-size trigger

## Current Issue

[`apps/erify_api/src/orchestration/fact-extraction/fact-extraction.service.ts`](../../apps/erify_api/src/orchestration/fact-extraction/fact-extraction.service.ts) is ~1110 LOC, over the 600-LOC threshold that `AGENTS.md` routes to the `backend-large-file-refactor` skill.

The size is concentrated in three near-identical paired-routing helpers — `tryAtomicPairedShowActuals`, `tryAtomicPairedCreatorActuals`, and `tryAtomicPairedShowPlatformActuals` — plus the collision-detection and fact-collection helpers. The logic is correct and well-tested; this is structure debt, not a behavior gap.

## Why It Matters

The file is the single home for the per-fact routing order that the [`fact-extraction-pipeline`](../../.agent/skills/fact-extraction-pipeline/SKILL.md) skill depends on, so it is read often. Each new hydrated scope (e.g. the PR 14.x client-mechanic facts) adds another paired-routing helper, and the third copy already shows the duplication is load-bearing rather than incidental.

## Desired Direction

- When the next paired or hydrated scope lands, extract the three `tryAtomicPaired*Actuals` helpers into a `paired-routing.ts` collaborator that the service delegates to, keeping `extractFromTask`'s routing loop as the readable entry point.
- Do **not** do a speculative split now: the helpers share private state (`collidingFacts`, the bulk-resolved target caches, `entries`) and a premature extraction would just move the coupling without reducing it.
- Keep the outcome-routing order (`fact-extraction-pipeline` skill, "Outcome routing order") intact across any move — it is the invariant, not the file boundary.

## Trigger To Fix

Refactor when any PR adds a **fourth** paired/hydrated extractor scope, or when the file crosses ~1300 LOC — whichever comes first. Until then this is accepted.

## Acceptance Criteria

- Paired-routing helpers live in a collaborator with the shared per-run state passed explicitly, not as a 1300+ LOC single class.
- `extractFromTask` still expresses the full routing order in one readable pass.
- No change to extraction outcomes or audit rows; existing `fact-extraction.service.spec.ts` coverage stays green.
