# PRD: Agentic Tool Enhancement & OKF Consolidation Program

**Status**: Active / In-Progress
**Type**: Product Requirements Document & Delivery Roadmap
**Owner**: AI Platform & Agent Systems Engineering

---

## 1. Overview & Objectives

This document serves as the repository PRD and delivery roadmap for consolidating agent skills, migrating static guides into Open Knowledge Format (OKF v0.2) bundles, establishing dynamic skill routing, and standardizing developer/agent tooling across `eridu-services`.

### Key Objectives
1. **Reduce Prompt Overhead & Token Waste**: Extract static reference material from `.agents/skills/` into canonical OKF v0.2 knowledge bundles (`knowledge/`), converting skills into thin procedural bridges.
2. **Cap Implicit Skill Routing (<50)**: Trim the active implicit skill catalog down to `<50` skills (target post-consolidation `<35`), setting `allow_implicit_invocation: false` for explicit-only workflows.
3. **Enhance Agentic Toolsuite**: Ensure developer & agent tools (`rtk`, `caveman`, `graphify`, `mattpocock`, `karpathy`) are intuitive, sharable, and documented across all supported clients.
4. **100% Cross-Client Compatibility**: Maintain full functionality across **Claude Code**, **Codex**, and **OpenCode with VSCode** without breaking public entrypoints.

---

## 2. Compatibility Invariants

- **Public Skill Entrypoints Preserved**: Public skill IDs (`pr-ready`, `knowledge-sync`, `repository-health`, `upload-openwebui-skill`, `graphify`, `caveman`, `mattpocock`, `karpathy`, etc.) must remain discoverable and invocable across Claude Code, Codex, and OpenCode.
- **Thin Bridge Pattern**: When static reference material is moved to `knowledge/`, thin procedural bridges remain in `.agents/skills/<name>/SKILL.md`.
- **Zero Loss of Functionality**: All changes must bring net-positive value to LLM prompt context size and execution speed without breaking existing slash commands or `$skill` / `/skill` triggers.

---

## 3. Delivery Strategy & Scope Roadmap

### Scope 1: Machine-Readable Skill Registry & Validation Tooling
- [x] **PR 1.1 — Skill Registry**: Add `.agents/agent-skill-registry.yaml` mapping all active skills to their classification (`capability-skill`, `thin-wrapper`, `knowledge-source`, `presentation-mode`, `workflow-bridge`).
- [x] **PR 1.2 — Validation Script Enforcement**: Update `scripts/validate-agent-skills.mjs` (`pnpm agents:validate`) to check registry coverage, validate knowledge links, and enforce character budgets.

---

### Scope 2: OKF Knowledge Migration & Skill Consolidation
- [x] **PR 2.1 — Pilot OKF Migration (Frontend Stack & Design Patterns)**:
  - Created `knowledge/engineering/frontend-tech-stack.md` & `knowledge/architecture/design-patterns.md`.
  - Converted `frontend-tech-stack` and `design-patterns` into thin procedural skills.
- [x] **PR 2.2 — Pilot Domain OKF Migration (Show Production Lifecycle)**:
  - Created `knowledge/domain/show-production-lifecycle.md`.
  - Converted `show-production-lifecycle` into a thin procedural skill.
- [ ] **PR 2.3 — Complete Engineering & Architecture OKF Migration**:
  - Extract static facts from `service-pattern-nestjs`, `backend-controller-pattern-nestjs`, `database-patterns`, `pwa-best-practices`, `table-view-pattern`, `backend-large-file-refactor` into OKF bundles under `knowledge/engineering/` and `knowledge/architecture/`.
  - Thin out corresponding skills in `.agents/skills/`.
- [ ] **PR 2.4 — Complete Skill Deduplication & Implicit Flag Cap (<50)**:
  - Set `allow_implicit_invocation: false` in `agents/openai.yaml` for explicit-only workflows and presentation modes.
  - Consolidate duplicate skills (`admin-list-pattern` into `table-view-pattern`, `solid-principles` into `code-quality`).

---

### Scope 3: Agentic Tool Enhancement (`rtk`, `caveman`, `graphify`, `mattpocock`, `karpathy`)
- [x] **PR 3.1 — Developer Tooling & Doctor Integration**:
  - Updated `scripts/check-agent-tooling.mjs` (`pnpm agents:doctor`) to verify `rtk`, `graphify`, `ripgrep`, Node 22, pnpm 10, and skill registry adapter.
- [x] **PR 3.2 — Shared Developer & Agent Documentation**:
  - Updated `AGENTS.md` with explicit guidance for `rtk`, `caveman`, `graphify`, `mattpocock`, and `karpathy`.

---

### Scope 4: Catalog Index Regeneration & Final Reconciliation
- [ ] **PR 4.1 — Index Regeneration & Full Workspace Verification**:
  - Regenerate `.agents/skills/INDEX.md` via `pnpm agents:index`.
  - Update `docs/engineering/AGENT_CONTENT_REORGANIZATION.md`.
  - Run full monorepo verification (`pnpm agents:validate`, `pnpm agents:doctor`, `pnpm lint`, `pnpm typecheck`, `pnpm build`).

---

## 4. Verification & Success Criteria

Every slice and PR must pass:
1. `pnpm agents:validate` — 100% clean, implicit skills cap < 50.
2. `pnpm agents:doctor` — All toolsuite components ready.
3. `pnpm lint` && `pnpm typecheck` && `pnpm build` — Zero errors across all workspaces.
