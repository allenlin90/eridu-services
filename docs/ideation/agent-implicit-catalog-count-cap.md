# Implicit Skill Catalog Count Cap

**Type**: Standalone — agent-content governance
**Origin**: Agentic Tool Enhancement & OKF Consolidation program, rows 1–4 (PRs [#367](https://github.com/allenlin90/eridu-services/pull/367), [#368](https://github.com/allenlin90/eridu-services/pull/368), [#369](https://github.com/allenlin90/eridu-services/pull/369))
**Status**: Open decision — the delivery levers are exhausted, the target is not met

## The open question

[`AGENT_OPERATING_MODEL.md`](../engineering/AGENT_OPERATING_MODEL.md) § Catalog targets sets two thresholds for the implicitly invocable skill catalog: **no more than 50** at the first reorganization milestone, then **35 or fewer** after overlap consolidation and knowledge extraction.

The catalog is at **57**. The gap is **7** to the first milestone and **22** to the target.

Every candidate that the reorganization identified has now been dispositioned, and none of the remaining ones can decrement the count. Reaching 50 is no longer a delivery step — it needs a decision about *which* of three different things to change.

## Why the delivery levers are exhausted

Two facts, both established by evidence in the repo rather than by argument:

1. **Extraction relocates facts; it does not remove a catalog entry.** All eight skills whose doctrine moved into [`knowledge/`](../../knowledge/index.md) in #367 are still `implicit: true` — each left a genuine procedure behind. The count decrements only when an entry is **deleted** (extraction leaves no procedure) or **merged** into another skill.
2. **The candidate list is spent.** All 25 entries the target portfolio budgets at 0 as standalone pattern or technology guides carry a reviewed disposition in [`AGENT_CONTENT_REORGANIZATION.md`](../engineering/AGENT_CONTENT_REORGANIZATION.md) § Candidate disposition table: 3 consolidated, 0 retired, 22 keep their catalog entry because each has a real procedure. That produced 66 → 63; the domain-clustering merge of ten skills into four then produced 63 → 57.

The character budget — a separate constraint often confused with this one — is met at 6,185 of 8,000. Do not report it as satisfying the count cap.

## Options

Each closes the gap differently, and each is a doctrine-level call rather than a task.

| # | Option | What it changes | Cost / risk |
| ---: | --- | --- | --- |
| 1 | **Whole-catalog consolidation review** | Look for overlap clusters *outside* the 25 candidates — the doc-lifecycle cluster, the Open WebUI/AI-platform cluster, the review-lens cluster — and merge where triggers genuinely coincide | Highest work; the honest lever, since it is one of the two canon sanctions. Risk: merging skills whose triggers only look similar degrades routing for both |
| 2 | **Deliberate doctrine amendment** | Add a narrow explicit-only class to [`.agents/README.md`](../../.agents/README.md) and `AGENT_OPERATING_MODEL.md` — e.g. "operates an external deployed system" | Moderate work, but must be argued on its own merits with cross-client routing parity evidence, in its own PR. It must not ride along in a delivery PR — that is exactly what #368 attempted and review rejected |
| 3 | **Target revision** | Change 50/35 to a number the current portfolio can actually reach without degrading routing | Cheapest, and legitimate if the original numbers were set before the portfolio was understood. Requires stating what evidence makes 57 (or another figure) the right ceiling |

Options 1 and 2 can combine. Option 3 should not be reached for first — it resolves the constraint by moving it.

## Binding constraint on any option

Reduction goes through **knowledge extraction and consolidation**, not through marking retained capability classes explicit-only. The full constraint, with its canon citations and the record of why #368's lever was rejected, is in [`AGENT_CONTENT_REORGANIZATION.md`](../engineering/AGENT_CONTENT_REORGANIZATION.md) § How the implicit catalog gets reduced. Read it before proposing any option here — it rules out the most tempting shortcut.

`implicit_catalog_ceiling: 57` in [`.agents/agent-skill-registry.yaml`](../../.agents/agent-skill-registry.yaml) ratchets the current count: `pnpm agents:validate` fails if the catalog grows, and warns until the 50 and 35 targets are met. The gap cannot silently widen while this decision is open.

## Decision gates

Promote this to a PRD when any of these fires:

- Codex routing quality measurably degrades and the catalog size is implicated;
- a new skill batch pushes against the ceiling and the ratchet starts blocking legitimate work;
- an agent-content review finds a genuine overlap cluster large enough to move the count meaningfully;
- the operating model is revisited for another reason and the 50/35 figures come up for reconsideration.

Absent one of those, 57 with an enforced ratchet is a stable state, not an emergency.

## Related docs

- [`AGENT_CONTENT_REORGANIZATION.md`](../engineering/AGENT_CONTENT_REORGANIZATION.md) — inventory, disposition table, reduction constraint, program record
- [`AGENT_OPERATING_MODEL.md`](../engineering/AGENT_OPERATING_MODEL.md) — catalog targets and exit criteria
- [`.agents/README.md`](../../.agents/README.md) — taxonomy, admission rules, target catalog
- [`.agents/agent-skill-registry.yaml`](../../.agents/agent-skill-registry.yaml) — the enforced ratchet
