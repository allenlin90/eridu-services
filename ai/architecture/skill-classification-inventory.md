# Skill Classification Inventory

Reference input for Phase 1/3 content migration (see `llm-knowledge-base-plan.md`), not actioned yet. Classifies each currently-live Open WebUI skill against the plan's Skills Versus Knowledge categories, so migration has a concrete starting point once content owners are ready to review and classify their department's material. Building and testing the sync/retrieval pipeline does not depend on this document — the pipeline is content-agnostic by design.

Source: `ai/openwebui/synced/skills/*.md` (19 files) cross-referenced against `models.json` (assistant attachment) and `groups.json` (group grants), as of the point-in-time pull recorded in `ai/openwebui/synced/`.

## Per-file classification

| File | Classification | Current assistant attachment | Note |
| --- | --- | --- | --- |
| `00000.md` | draft/stale (orphaned index) | none | Describes 5 files (2 confidential, 3 draft) that don't exist among the live 19; word counts stale |
| `0001.md` | behavior | none (orphaned) | Genuine routing/tone/conflict-resolution rules, currently unused |
| `00010.md` | draft/stale + behavior (mixed) | Eridu Brain | Lines ~11-70 are project-history narration; lines ~71-104 are real routing rules duplicating `0001.md` |
| `0002.md` | department knowledge, mild restricted flag | Erify-Performance, Eridu Brain | Cross-pillar metrics, fine to share department-wide; repeatedly cites "cash is TIGHT" as urgency framing |
| `decisionlog.md` | behavior/meta, trivial | Eridu Brain | Empty template, no entries yet |
| `org-chart.md` | shared knowledge | Finance, HR Assistants, Eridu Brain | Reporting lines/roles, not sensitive |
| `core-principles.md` | shared knowledge | all 9 assistants + Brain | Universal, no hard numbers — top `wiki-shared` candidate |
| `governance-ops.md` | shared knowledge | all 9 assistants + Brain | Universal SOPs, not sensitive |
| `financial-guardrails.md` | department + restricted (mixed) | Finance Assistant, Eridu Brain | Spend tiers fine to share; embeds a live "Cash position: TIGHT" signal |
| `finance-ops.md` | department knowledge | Finance Assistant, Eridu Brain | AP/AR/tax SOPs, no hard figures directly, but Finance-owned |
| `hr-ops.md` | department knowledge | Eridu Brain only (not attached to the dedicated HR Assistant) | Termination/severance schedule, PIP process, leave policy |
| `legal-process.md` | department + restricted (mixed) | Eridu Brain | Contract thresholds fine; embeds a PDPA-compliance-gap admission ("Partially compliant... needs gap assessment") |
| `openwebui-litellm-railway-integration-guide.md` | obsolete | Eridu Brain | Misplaced platform-ops documentation (env vars, master-key guidance, SQL against Open WebUI's own user table), duplicates and is now stale relative to `ai/litellm/README.md` and `ai-platform-release-management` — delete, don't migrate |
| `sales.md` | department knowledge | Commerce-Sales Assistant, Brain | Commission rates (1%/2%/1%) — compensation-adjacent, Commerce-owned |
| `commerce.md` | department knowledge | Commerce assistants, Brain | Account mgmt/vendor SOPs, no major figures |
| `content-management.md` | department knowledge | 3 Erify assistants, Brain | Production SOPs; ~400K THB/month cost figures (operational, not confidential-tier) |
| `creator-management.md` | department knowledge | Erisa assistants, Brain | Fee-sharing % table by tier — a real internal rate card, moderately sensitive |
| `affiliate-management-.md` | department knowledge | Erisa-ADP Assistant, Brain | Vendor-negotiation playbook — valuable IP if leaked externally, fine internally |
| `talent-development-framework.md` (37K, largest) | department knowledge, audience mismatch | Eridu-HR Assistant, Brain | Own header states audience as "Managers + HR"; no salary figures present (deferred to a `hr-confidential.md` that isn't among the live 19 — unverified whether it exists elsewhere) |

## Synthesis

- **Behavior vs. knowledge**: only `0001.md` is cleanly "behavior" per the plan's definition, and it's currently orphaned. `decisionlog.md` is empty scaffolding. The other 16 are knowledge-shaped content that should migrate out of Open WebUI skills.
- **Delete, don't migrate**: `openwebui-litellm-railway-integration-guide.md` (stale platform docs) and `00000.md` (orphaned index).
- **Mixed files needing surgical paragraph-level extraction, not a single whole-file label**: `financial-guardrails.md`, `legal-process.md`, `00010.md`. Each has one clearly-restricted or clearly-stale paragraph embedded in otherwise-shareable content — mixing sensitivity levels in one file is the exact anti-pattern the plan's access-control design warns against.
- **The plan's 8-collection bucket list (`wiki-shared`, `wiki-onboarding`, `wiki-commerce`, `wiki-erify`, `wiki-erisa`, `wiki-finance-ops`, `wiki-finance-confidential`, `wiki-hr`) has gaps against what was actually found**:
  - `wiki-onboarding` has no standalone source — onboarding steps are sub-sections buried inside `hr-ops.md` and `commerce.md`, needing extraction work, not just a re-grant.
  - Restricted-tier content isn't finance-only: Legal's PDPA gap, Erisa's fee-sharing table, and Sales' commission rates all qualify. A single `wiki-finance-confidential` bucket undercovers this — per-pillar restricted sub-buckets or a metadata-driven sensitivity field is a better fit than a fixed bucket list.
  - `wiki-hr` as one bucket doesn't distinguish general employee-facing policy (leave, onboarding) from manager-only process (`talent-development-framework.md`'s PIP scripts, promotion rubric) — its own stated audience is narrower than "all HR-eligible staff."
- **Unverified**: `finance-confidential.md`/`hr-confidential.md` are referenced by name in multiple skills as if they exist, but aren't among the live 19. Confirm whether they exist elsewhere in Open WebUI (or were never created) before assuming the sensitive figures they'd hold simply aren't live anywhere.
