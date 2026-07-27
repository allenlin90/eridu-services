---
name: phase4-merge-program
description: Phase 4 cross-session merge program policy (2026-03-11) — scope-first branching, mc/creator cutover strategy, PR standards
metadata:
  type: project
---

- Cross-session tracker: `docs/roadmap/PHASE_4_MERGE_PROGRAM.md`
- Merge strategy: scope-first branches from `master`, using `feat/phase-4-p-and-l` as reference only.
- Policy: direct `mc` -> `creator` cutover is preferred (alpha/low-traffic), avoid adding new compatibility layers.
- PR standard: one topic per PR, explicit in-scope/out-of-scope/rollback, verify touched workspaces before merge.
