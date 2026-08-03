# Agentic Tool Enhancement & OKF Consolidation Program

**Status**: Active — 1 of 4 PRs merged
**Type**: Multi-PR execution tracker for repository tooling
**Owner**: AI Platform & Agent Systems Engineering

> **Doc-type note.** This is an execution tracker, not a PRD as [`docs/prd/README.md`](./README.md) defines one — it has no user stories, acceptance criteria, or product rules, and it covers repository tooling rather than a user-facing feature. It currently lives in `docs/prd/` for historical reasons. Relocating it to a roadmap tracker is tracked as row 4 below; until then, treat § 4 (PR Roadmap) as the authoritative progress record.

---

## 1. Background & Why

**Background.** `.agents/skills/` grew to 102 skills that mixed two different kinds of content: *procedures* (what an agent should do) and *knowledge* (what is true about this repo's architecture, domain, and stack). [`.agents/README.md`](../../.agents/README.md) classifies these as separate content classes with separate homes, but the tree predates that taxonomy. Two costs followed:

1. **Routing cost.** Every implicitly invocable skill contributes its `description` to the catalog Codex injects into each session. That catalog was 8,991 characters against a ~8,000-character fallback budget, so Codex could silently shorten or drop entries — degrading routing for skills that were never the problem.
2. **Retrieval cost.** Durable facts were only reachable by loading a whole procedural skill, and had no lifecycle metadata (`status`, `stale_after`, `sources`), so no agent could tell current doctrine from stale doctrine.

**Why now.** [`docs/engineering/OKF_AGENT_CONTRACT.md`](../engineering/OKF_AGENT_CONTRACT.md) already specifies the strict OKF v0.2 profile this repo targets, and [`AGENT_CONTENT_REORGANIZATION.md`](../engineering/AGENT_CONTENT_REORGANIZATION.md) already names the extraction candidates. The contract existed with nothing conforming to it. This program makes `knowledge/` real and puts the catalog under enforced limits so neither can regress silently.

**Why not just delete skills.** Skill count and catalog characters are different constraints (see § 4.1). Cutting content out of `SKILL.md` bodies saves nothing against the catalog budget — only `allow_implicit_invocation: false` does. Deleting bodies to "save tokens" trades real doctrine for zero benefit.

### Key Objectives

1. **Reduce Prompt Overhead & Token Waste**: Extract static reference material from `.agents/skills/` into canonical OKF v0.2 knowledge bundles (`knowledge/`), converting skills into thin procedural bridges.
2. **Cap Implicit Skill Routing**: Reduce the implicit skill catalog to **no more than 50** entries, then **35 or fewer** after overlap consolidation and knowledge extraction (canon wording — both thresholds are inclusive).
3. **Enhance Agentic Toolsuite**: Ensure developer & agent tools (`rtk`, `caveman`, `graphify`, `mattpocock`) are intuitive, sharable, and documented across all supported clients.
4. **100% Cross-Client Compatibility**: Maintain full functionality across **Claude Code**, **Codex**, and **OpenCode with VSCode** without breaking public entrypoints.

---

## 2. Architecture & Knowledge Flow Diagrams

### System Architecture & Thin Skill Routing

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Agents & Entrypoints"]
        Claude["Claude Code (.claude/CLAUDE.md)"]
        Codex["OpenAI Codex (.agents/skills/)"]
        OpenCode["OpenCode (opencode.json)"]
    end

    subgraph RegistryLayer ["Registry & Governance"]
        Taxonomy[".agents/README.md"]
        Registry[".agents/agent-skill-registry.yaml"]
        Validator["scripts/validate-agent-skills.mjs"]
    end

    subgraph SkillLayer ["Thin Skill Procedures (.agents/skills/)"]
        ThinSkill1["frontend-tech-stack/SKILL.md"]
        ThinSkill2["design-patterns/SKILL.md"]
        ThinSkill3["show-production-lifecycle/SKILL.md"]
    end

    subgraph KnowledgeLayer ["Canonical OKF v0.2 Knowledge (knowledge/)"]
        EngBundle["knowledge/engineering/*.md"]
        ArchBundle["knowledge/architecture/*.md"]
        DomainBundle["knowledge/domain/*.md"]
    end

    ClientLayer --> RegistryLayer
    RegistryLayer --> SkillLayer
    ThinSkill1 -->|dynamic OKF reference| EngBundle
    ThinSkill2 -->|dynamic OKF reference| ArchBundle
    ThinSkill3 -->|dynamic OKF reference| DomainBundle
```

### Catalog Token Optimization & Policy Gate

```mermaid
flowchart LR
    subgraph RawCatalog ["Original Catalog (102 skills, all implicit)"]
        RawPrompt["Global Implicit Prompt (8,991 chars)"]
    end

    subgraph PolicyGate ["OpenAI Policy Gate (agents/openai.yaml)"]
        CheckImplicit{"allow_implicit_invocation?"}
    end

    subgraph FilteredCatalog ["Optimized Routing Catalog"]
        ImplicitSkills["Implicit Capability Skills (66) — target &lt;50, then &lt;35"]
        ExplicitSkills["Explicit-Only Skills (36) ($skill / /command)"]
    end

    RawPrompt --> PolicyGate
    CheckImplicit -->|true| ImplicitSkills
    CheckImplicit -->|false| ExplicitSkills
    ImplicitSkills --> BudgetCheck["Character Budget 7,074 / 8,000 (met)"]
```

The character budget and the skill-count cap are **two different constraints**. PR 1 met the budget. The count cap is not met and is reached by knowledge extraction, not by marking skills explicit-only — see § 4.2.

---

## 3. Compatibility Invariants

- **Public Skill Entrypoints Preserved**: Public skill IDs (`pr-ready`, `knowledge-sync`, `repository-health`, `upload-openwebui-skill`, `graphify`, `caveman`, `setup-matt-pocock-skills`, etc.) must remain discoverable and invocable across Claude Code, Codex, and OpenCode. Codex `interface:` metadata (display name, short description, icons, default prompt) is part of the entrypoint and must survive any `agents/openai.yaml` edit.
- **Thin Bridge Pattern**: When static reference material is moved to `knowledge/`, thin procedural bridges remain in `.agents/skills/<name>/SKILL.md`, and every `references/` file stays reachable from either the bridge or the knowledge concept.
- **Zero Loss of Doctrine**: Content moves to `knowledge/` **verbatim**. Resummarizing doctrine into bullets is not migration — it deletes rules. Section numbering that other documents cite (for example `database-patterns` §6 and §12) is preserved, and every citing document is repointed in the same PR.
- **No Invented Facts**: Every code-level claim written into `knowledge/` (state values, guard names, component names, script names) is verified against source first. `pnpm agents:validate` checks bundle structure, not truth.
- **Zero Loss of Functionality**: All changes must bring net-positive value to LLM prompt context size and execution speed without breaking existing slash commands or `$skill` / `/skill` triggers.

> **Note on token savings**: `pnpm agents:validate` counts only frontmatter `description` characters toward the Codex catalog budget. Thinning a `SKILL.md` **body** saves nothing against that budget — the entire reduction comes from `allow_implicit_invocation: false`. Do not delete body content in the name of catalog savings.

---

## 4. PR Roadmap

Progress record for this program. **Every PR in this program states its row number and the remaining count in its description** (see [`pr-review.md`](../../.agents/workflows/pr-review.md) § PR description check).

| # | PR | Scopes | Depends on | Status |
| --- | --- | --- | --- | --- |
| 1 | Skill registry, validator enforcement, OKF bundle + doctrine extraction, toolsuite docs | 1, 2.1–2.3, 3, 4.1 | — | ✅ Done ([#367](https://github.com/allenlin90/eridu-services/pull/367)) |
| 2 | ~~Implicit-catalog triage — mark human-decision-triggered skills explicit-only~~ | — | 1 | ❌ **Withdrawn** — conflicts with canonical routing doctrine; see § 4.2 |
| 3 | Candidate disposition review — decide `retire` / `consolidate` / `keep as thin skill` for each of the 25 extraction candidates, then apply | 2.4 | 1 | ⬜ Not started — **target reachability unproven until the disposition table exists** |
| 4 | Final reconciliation — inventory counts, relocate this tracker out of `docs/prd/`, cross-client routing verification | 4.2 | 3 | ⬜ Not started |

**Remaining: 2 of 4 PRs** (row 2 withdrawn, not replaced).

Row 2 was attempted in [#368](https://github.com/allenlin90/eridu-services/pull/368) and withdrawn on review. The reason is recorded in § 4.2 because it constrains how rows 3 and 4 may reduce the catalog.

**No row currently demonstrates a path to "35 or fewer".** Row 3 must produce the reviewed disposition table first; the reachable count follows from those decisions. If it falls short, closing the gap is an explicit decision in its own PR — a deliberate doctrine amendment or a target revision — not an assumption folded into a delivery PR.

### 4.1 Two constraints, tracked separately

| Constraint | Limit | Current | State |
| --- | --- | --- | --- |
| Implicit description characters (Codex catalog budget) | 8,000 | **7,074** | ✅ Met (PR 1) |
| Implicitly invocable skill count | ≤50, then ≤35 | **66** | ❌ Not met — PR 3 |
| Regression ratchet (`implicit_catalog_ceiling`) | 66 | 66 | 🔒 Enforced — validation fails if exceeded |

These are independent. PR 1 met the character budget and did not move the count. Do not report one as satisfying the other.

### 4.2 Routing-policy constraint (why row 2 was withdrawn)

**The implicit catalog is reduced by knowledge extraction and consolidation — not by marking capabilities explicit-only.** This is canon, not preference:

- [`.agents/README.md`](../../.agents/README.md) § Target Catalog: the implicit catalog **should contain** lifecycle and reasoning capabilities, concrete implementation and **operational** capabilities, and declared **review lenses**. It should **not** contain standalone pattern or technology guides, domain and architecture reference documents, duplicated workflow bodies, or unrequested presentation modes.
- [`AGENT_OPERATING_MODEL.md`](../engineering/AGENT_OPERATING_MODEL.md) § Catalog targets: reach "**no more than 50**" in the first reorganization milestone, reach "**35 or fewer**" after "**overlap consolidation and knowledge extraction**", and mark **manual workflows and presentation modes** explicit-only.

PR #368 marked 18 skills explicit-only using a different axis — "human decision vs. an agent touched this code". That axis is defensible on its own terms, but it flipped members of the classes canon retains in the implicit catalog (7 deployed-platform operations, `pr-ui-screenshot-review`, `plan-workflow-completeness`), and it substituted a lever canon does not sanction for the two it does. It was withdrawn rather than merged with the canonical documents left asserting the superseded rule, which the [pattern/direction-change gate](../../.agents/skills/agent-instruction-maintenance/SKILL.md) treats as blocking.

**Extraction alone does not reduce the catalog count.** An earlier revision of this section claimed 66 − 25 = 41 from extraction. That is wrong, and the counter-evidence is already in the repo: all eight skills whose doctrine moved to `knowledge/` in PR 1 — `database-patterns`, `design-patterns`, `frontend-tech-stack`, `show-production-lifecycle`, and the rest — are still `implicit: true`. Extraction **relocates facts**; the skill remains in the catalog as a thin procedure.

The implicit count decrements only when an entry is:

1. **deleted** — extraction leaves no genuine procedure behind, so the skill itself retires; or
2. **merged** — two overlapping skills consolidate into one.

PR 1 judged all eight of its candidates to have a genuine procedure worth keeping. That is a real prior: some fraction of any extraction batch will stay in the catalog, not retire from it.

**Therefore the reachable count is currently undetermined, and PR 3 is not yet shown to reach 35 or fewer.** Before PR 3 claims any target, it must produce a reviewed disposition per candidate — `retire`, `consolidate into <id>`, or `keep as thin skill` — and derive the resulting count from those decisions rather than from the size of the candidate list. If the reviewed dispositions do not reach 35 or fewer, the remaining gap is an explicit decision, not an assumption: either a deliberate doctrine amendment (see below) or a revision of the target, argued in its own PR.

If a narrow explicit-only class is still wanted later — for example "operates an external deployed system" — it must be proposed as a deliberate amendment to `.agents/README.md` and `AGENT_OPERATING_MODEL.md`, with cross-client routing parity evidence, in its own PR. It must not ride along in a delivery PR.

---

## 5. Scope & Delivery Roadmap Checklist

### Scope 1: Machine-Readable Skill Registry & Validation Tooling
- [x] **1.1 Skill Registry**: Add `.agents/agent-skill-registry.yaml` mapping all active skills to classification, lifecycle stage, and knowledge sources.
- [x] **1.2 Validation Script Enforcement**: Update `scripts/validate-agent-skills.mjs` (`pnpm agents:validate`) to check registry coverage, validate knowledge links, and enforce character budgets.
- [x] **1.3 Registry Metadata Is Enforced, Not Decorative**: `implicit` in the registry is cross-checked against each skill's `agents/openai.yaml`; drift fails validation. `implicit_catalog_ceiling` ratchets the implicit count so it cannot silently grow.
- [x] **1.4 OKF Bundle Validation**: Validate `knowledge/` structurally — bundle-root `okf_version`, fenced YAML frontmatter on every concept, non-empty `type` and `description`, `okf_version` only at the root, and index coverage.

---

### Scope 2: OKF Knowledge Migration & Skill Consolidation
- [x] **2.1 Core Engineering & Architecture OKF Migration**:
  - [x] Create `knowledge/engineering/frontend-tech-stack.md` and convert `frontend-tech-stack` to a thin procedural skill bridge.
  - [x] Create `knowledge/architecture/design-patterns.md` and convert `design-patterns` to a thin procedural skill bridge.
  - [x] Create `knowledge/architecture/service-pattern-nestjs.md` and convert `service-pattern-nestjs` to a thin procedural skill bridge.
  - [x] Create `knowledge/architecture/backend-controller-pattern-nestjs.md` and convert `backend-controller-pattern-nestjs` to a thin procedural skill bridge.
  - [x] Create `knowledge/architecture/database-patterns.md` and convert `database-patterns` to a thin procedural skill bridge.
- [x] **2.2 Core Domain OKF Migration**:
  - [x] Create `knowledge/domain/show-production-lifecycle.md` and convert `show-production-lifecycle` to a thin procedural skill bridge.
  - [x] Create `knowledge/engineering/pwa-best-practices.md` and convert `pwa-best-practices` to a thin procedural skill bridge.
  - [x] Create `knowledge/engineering/table-view-pattern.md` and convert `table-view-pattern` to a thin procedural skill bridge.
- [x] **2.3 Implicit Catalog Character Budget (<8KB limit)**:
  - [x] Configure explicit policy (`allow_implicit_invocation: false`) for presentation modes and manual workflows (`caveman`, `cavecrew`, `graphify`, `setup-matt-pocock-skills`, etc.) — 36 skills explicit-only at merge, including three presentation modes added in review.
  - [x] Reduce implicit description character budget from 8,991 to 7,074 characters (below the 8,000 budget).
- [ ] **2.4 Implicit Skill *Count* Cap — NOT MET**:
  - Current: **66** implicitly invocable skills. Milestone: **no more than 50**; post-consolidation: **35 or fewer**.
  - The character budget above is met; the count cap is a separate, unfinished constraint. `implicit_catalog_ceiling: 66` prevents regression while this stays open.
  - [ ] Consolidate overlapping list pattern skills (`admin-list-pattern`, `studio-list-pattern`).
  - [ ] Consolidate quality and architecture skills (`solid-principles` into `code-quality`).
  - [ ] Lower `implicit_catalog_ceiling` in `.agents/agent-skill-registry.yaml` with each reduction.

---

### Scope 3: Agentic Tool Enhancement (`rtk`, `caveman`, `graphify`, `mattpocock`)
- [x] **3.1 Developer Tooling & Doctor Integration**:
  - [x] Update `scripts/check-agent-tooling.mjs` (`pnpm agents:doctor`) to verify `rtk`, `graphify`, `ripgrep`, Node 22, pnpm 10, and skill registry adapter.
- [x] **3.2 Shared Developer & Agent Documentation**:
  - [x] Update `AGENTS.md` with a toolsuite table for `rtk`, `caveman`, `graphify`, and `mattpocock`, each pointing at its owning skill or section.
  - [x] Drop `karpathy` as a named tool — no such skill exists. Those principles are `AGENTS.md` § Shared Behavioral Guidelines and apply unconditionally.

---

### Scope 4: Catalog Index Regeneration & Final Reconciliation
- [x] **4.1 Index Regeneration**:
  - [x] Regenerate `.agents/skills/INDEX.md` via `pnpm agents:index`.
- [ ] **4.2 Final Inventory Update & Operating Model Reconciliation**:
  - [ ] Update `docs/engineering/AGENT_CONTENT_REORGANIZATION.md` with final skill counts.
  - [ ] Conduct final end-to-end verification pass across Claude Code, Codex, and OpenCode.

---

## 6. Value Delivered To `master`

What each merged PR actually changed for someone working in this repo. Filled in at merge, not at open.

### PR 1 — merged

- **Agents get correct doctrine.** 8 concepts now carry the full rule set with lifecycle metadata, so a skill can no longer hand an agent a four-bullet summary in place of the rule that mattered. Restored content includes the `txHost` lazy-delegate rule, the `createdAt`-ordering trap, the optimistic-lock bump rule, the metadata-vs-audit gate, migration naming policy, and the CDN cache-poisoning section.
- **Three classes of wrong fact removed** from canonical docs: a show lifecycle with two states that do not exist, a guard API (`RolesGuard`, `@RequirePermission`) that does not exist, and two table components that do not exist. Each replaced with the verified value from source.
- **Codex catalog fits its budget**: 8,991 → 7,074 characters, 36 skills explicit-only. Codex no longer silently truncates skill entries.
- **`knowledge/` is machine-checkable.** `pnpm agents:validate` now fails on malformed OKF frontmatter, a missing `type`, an unindexed concept, registry/`openai.yaml` drift, or implicit-catalog growth. Before this, none of those were detectable.
- **Nothing is orphaned or dangling**: all 12 `references/` files reachable, all cited section numbers resolve, Codex `interface:` metadata intact.

---

## 7. Verification & Success Criteria

Every PR in this program must pass:

1. `pnpm agents:validate` — zero errors. This enforces registry coverage, registry/`openai.yaml` implicit agreement, the `implicit_catalog_ceiling` ratchet, OKF bundle structure, and local link resolution. The "no more than 50" implicit-count target is reported as a warning until Scope 2.4 closes.
2. `pnpm agents:index` — regenerated; `agents:validate` fails on a stale index.
3. `pnpm agents:doctor` — All toolsuite components ready.
4. `pnpm lint:markdown` — Markdown formatting clean.
5. `pnpm lint` && `pnpm typecheck` && `pnpm build` — Zero errors across all workspaces.

Structural validation is necessary but not sufficient. Content correctness — that a documented state value, guard, or component actually exists — is a **reviewer** responsibility; no script checks it.
