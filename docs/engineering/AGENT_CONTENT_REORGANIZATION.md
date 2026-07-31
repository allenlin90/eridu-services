# Agent Content Reorganization

## Status

This is the migration inventory and execution plan for the 94 entries currently indexed under `.agents/skills/`. It establishes review and bookkeeping scope; provisional classifications still require focused content review.

A content move is complete only when routing, links, validation, and behavior have been verified with Claude Code, Codex, and OpenCode.

Canonical references:

- [`.agents/README.md`](../../.agents/README.md) — taxonomy and admission rules.
- [`AGENT_OPERATING_MODEL.md`](./AGENT_OPERATING_MODEL.md) — target reasoning lifecycle, mode timing, pattern-consumer model, portfolio targets, and exit criteria.

## Why Reorganize

The current skill directory combines several different concerns:

- genuine task procedures;
- lifecycle and reasoning interventions;
- thin wrappers around repository workflows;
- presentation modes;
- architecture, pattern, and technology references;
- current domain state;
- duplicated review doctrine;
- client routing surfaces.

This weakens retrieval because every entry competes in the skill catalog even when it is not a task capability. It also gives factual content a skill lifecycle rather than an OKF or documentation lifecycle.

Examples of obvious shape mismatch:

- [`frontend-tech-stack`](../../.agents/skills/frontend-tech-stack/SKILL.md) is primarily a technology/version and project-structure reference.
- [`design-patterns`](../../.agents/skills/design-patterns/SKILL.md) is primarily repository architecture doctrine.
- [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) is primarily a domain model, lifecycle state, current surfaces, and known gaps.
- [`zoom-out`](../../.agents/skills/zoom-out/SKILL.md) is an orientation intervention but is currently modeled as an explicit user mode.
- [`grill-me`](../../.agents/skills/grill-me/SKILL.md) and [`grill-with-docs`](../../.agents/skills/grill-with-docs/SKILL.md) duplicate decision-questioning behavior and apply it too broadly.

## Target State

The reorganization is not complete when files have merely moved. The target is a smaller operating system with clear consumers and lifecycle timing.

### Target portfolio

| Category | Target |
| --- | ---: |
| Lifecycle and reasoning skills | 5–10 |
| Concrete capability skills | 20–40 |
| Review lenses | 5–10 |
| Workflow wrappers | Fewer than 10 where cross-client discovery requires them |
| Presentation modes | 1–3 explicit-only |
| Standalone knowledge/pattern entries in implicit catalog | 0 |

### Catalog milestones

1. First milestone: no more than **50 implicitly invocable skills**.
2. Post-consolidation target: **35 or fewer implicitly invocable skills**.
3. Every implicit entry must name an action or reasoning gate and a verifiable output.
4. Every manual workflow and presentation mode must be explicit-only where client support permits.
5. Pattern and guide knowledge must be loaded by consumer skills rather than competing directly in global routing.

The ranges are not quotas. A skill survives only when its trigger, procedure, and output remain materially distinct.

## Canonical Development Flow

The target flow is:

```text
orient
  → resolve material decisions
  → select knowledge and procedures
  → plan and implement
  → review through relevant lenses
  → verify and reconcile knowledge
  → present
```

Correct timing matters:

- context expansion happens before planning;
- decision challenge happens before implementation, only when a material choice remains;
- patterns are selected after scope is understood and before implementation;
- review lenses are selected from change signals, not invoked indiscriminately;
- presentation modes run after reasoning and must not control technical decisions.

## Revised Provisional Inventory

| Disposition | Count | Meaning |
| --- | ---: | --- |
| Keep as procedural skill | 67 | Appears task-triggered and procedural; still subject to quality review |
| Thin skill plus extracted knowledge | 8 | Mixed or predominantly factual; retain routing/procedure only |
| Workflow wrapper | 9 | Authoritative orchestration belongs under `.agents/workflows/` |
| Presentation mode | 1 | Output style only, explicit user trigger |
| Reasoning intervention rework | 3 | Must move into lifecycle timing rather than remain explicit modes |
| Consolidation review | 6 | Overlapping capability boundaries require review |
| **Total** | **94** | Matches the generated index at the time of this audit |

### Keep as procedural skill — provisional

- `admin-list-pattern`
- `agent-instruction-maintenance`
- `ai-platform-capability-verification`
- `ai-platform-release-management`
- `api-performance-optimization`
- `astro-starlight-best-practices`
- `authentication-authorization-nestjs`
- `backend-controller-pattern-nestjs`
- `backend-large-file-refactor`
- `backend-testing-patterns`
- `data-compatibility-migration`
- `data-validation`
- `diagnose`
- `doc-hygiene`
- `domain-refactor-cutover-strategy`
- `environment-configuration-zod`
- `eridu-auth-oauth-provider`
- `eridu-docs-information-architecture`
- `eridu-playwright`
- `eridu-security-threat-model`
- `erify-api-capability-refactoring`
- `erify-authorization`
- `excel-creator-mapping`
- `fact-extraction-pipeline`
- `file-upload-presign`
- `frontend-api-layer`
- `frontend-bundle-splitting`
- `frontend-code-quality`
- `frontend-error-handling`
- `frontend-i18n`
- `frontend-performance`
- `frontend-state-management`
- `frontend-testing-patterns`
- `frontend-ui-components`
- `jsonb-analytics-snapshot`
- `litellm-admin-api`
- `local-database-cli`
- `monorepo-doc-layering`
- `observability-logging`
- `openwebui-assistant-adapter`
- `openwebui-extensibility-design`
- `openwebui-groups-permissions`
- `openwebui-mcp-tool-integration`
- `openwebui-rest-api`
- `openwebui-skill-sync`
- `orchestration-service-nestjs`
- `package-extraction-strategy`
- `plan-workflow-completeness`
- `pr-ui-screenshot-review`
- `prod-data-sync`
- `prototype`
- `pwa-best-practices`
- `railway-template-config`
- `repository-pattern-nestjs`
- `schedule-continuity-workflow`
- `secure-coding-practices`
- `service-pattern-nestjs`
- `setup-matt-pocock-skills`
- `shared-api-types`
- `soft-delete-restore`
- `spreadsheet`
- `ssr-auth-integration`
- `studio-list-pattern`
- `table-view-pattern`
- `template-system-fact-migration`
- `ui-mockup-discussion`
- `user-facing-docs`
- `wiki-knowledge-maintainer`

This category means “not yet an obvious move candidate,” not “already ideal.” Pattern-named entries in this list still require a factual-versus-procedural review.

### Thin skill plus extracted knowledge

- `ai-workspace-control-plane`
- `database-patterns`
- `design-patterns`
- `frontend-tech-stack`
- `operations-review-surface`
- `shift-schedule-pattern`
- `show-production-lifecycle`
- `task-template-builder`

Expected pattern:

```text
SKILL.md
  trigger + knowledge selection + task workflow + verification

knowledge/... or docs/...
  canonical patterns, architecture, domain concepts, current state, and policies

references/...
  implementation depth needed only after selecting the skill
```

The first extraction pilot uses:

1. `frontend-tech-stack` — engineering stack knowledge.
2. `design-patterns` — architecture doctrine and pattern-selection knowledge.
3. `show-production-lifecycle` — business-domain lifecycle knowledge.

Each extraction must land with the skill or reasoning consumer that retrieves and applies the new canonical source.

### Workflow wrappers

- `codebase-hardening-program`
- `doc-lifecycle`
- `knowledge-sync`
- `pr-ready`
- `repository-health`
- `tdd`
- `to-issues`
- `to-prd`
- `triage`

A wrapper may remain under `.agents/skills/` for cross-client discoverability. Its body should route to one authoritative workflow and contain no second copy of the steps.

Review whether `schedule-continuity-workflow` should join this category after inspecting whether its implementation procedure is independent of its orchestration flow.

## Mode and Reasoning Corrections

The previous “explicit modes” category was incorrect because it grouped four different functions.

### `caveman` — presentation mode

Target:

- remain explicit-only;
- affect communication after reasoning, not exploration, planning, implementation, or review;
- default to turn-scoped unless the user explicitly requests persistence;
- retain clarity overrides for warnings, destructive actions, decisions, and verification.

It should eventually move to a presentation-mode registry if Claude, Codex, and OpenCode can consume one consistently.

### `zoom-out` — orientation reasoning

Target:

- retire as an explicit-only presentation-style skill;
- merge its useful behavior into context orientation, impact analysis, planning, and architecture review;
- trigger automatically when the affected scope, callers, ownership, runtime, or domain context is unclear;
- produce a concrete system map and authority-source list before planning.

### `grill-me` — bounded decision challenge

Target:

- replace “interview relentlessly” with a bounded decision-resolution procedure;
- inspect code and canonical knowledge before asking questions;
- challenge only material unresolved choices;
- order questions by dependency and stop once implementation can proceed;
- record decisions, rationale, rejected alternatives, and remaining gates.

### `grill-with-docs` — domain reconciliation

Target:

- merge its decision questioning into the common decision-challenge procedure;
- move glossary, terminology, and ADR policy into canonical domain/documentation governance;
- run contradiction detection during orientation and review;
- replace assumed generic `CONTEXT.md` paths with this repository’s actual docs and OKF sources.

## Pattern and Guide Extraction Target

### Rule

A pattern says what a good implementation looks like. A capability skill says how to complete a concrete task using the applicable patterns.

Pattern and guide documents should therefore be knowledge or reference material unless they also contain a distinct reusable procedure.

### Likely extraction families

- frontend and backend technology-stack guides;
- design and SOLID doctrine;
- controller, service, repository, orchestration, and persistence patterns;
- API route and schema conventions;
- testing strategy and quality checklists;
- UI, list, table, and state-management patterns;
- domain lifecycle, relationship, and current-surface descriptions;
- deployed platform topology and version-sensitive facts.

This does not necessarily delete every corresponding skill. It makes the skill thin and procedural while moving the canonical facts into knowledge.

### Primary pattern consumers

Pattern knowledge should normally be consumed by:

1. context orientation and impact analysis;
2. pattern selection and design reasoning;
3. concrete implementation capabilities;
4. declared review lenses;
5. knowledge reconciliation after changes.

A developer should request “implement this service” or “review this architecture.” The consumer skill should select service, persistence, SOLID, and repository doctrine automatically. The developer should not need to name every pattern file.

## Engineering Review Target

The current cluster is:

- `code-quality`
- `engineering-best-practices-enforcer`
- `improve-codebase-architecture`
- `solid-principles`

Target responsibilities:

| Target capability | Responsibility |
| --- | --- |
| Repository-convention review | Check repo rules, package/dependency policy, verification, documentation lifecycle |
| Architecture reasoning/review | Map context, find coupling and ownership problems, compare design alternatives |
| Code-quality verification | Run and interpret lint, typecheck, test, build, and static quality signals |
| Pattern knowledge | SOLID, deep modules, clean-code heuristics, and architectural vocabulary |

`solid-principles` should become pattern knowledge or a reference lens, not an always-on global implementation skill. `improve-codebase-architecture` should retain a procedural architecture-discovery/review capability but load terminology and principles as knowledge. `engineering-best-practices-enforcer` should become the repository-convention review. `code-quality` should focus on deterministic quality tooling and verification.

## Skill-Authoring Target

Current cluster:

- `eridu-skill-creator`
- `write-a-skill`

Target:

- one repository-authoritative agent-content authoring capability;
- generic Agent Skills format guidance as a reference;
- one classification gate covering skills, workflows, rules, knowledge, modes, and adapters;
- no overlapping implicit triggers.

## Additional Clusters to Inspect

- `admin-list-pattern`, `studio-list-pattern`, and `table-view-pattern`;
- `doc-hygiene`, `doc-lifecycle`, `knowledge-sync`, `monorepo-doc-layering`, and `user-facing-docs`;
- `frontend-code-quality`, `code-quality`, and repository-convention review;
- `ai-workspace-control-plane`, Open WebUI skills, LiteLLM skills, and future `infra/` knowledge;
- feature-specific pattern skills whose current-state facts already exist in feature, domain, or app documentation.

## Machine-Readable Registry Target

Do not add repository-specific classification fields to every `SKILL.md` until Claude Code, Codex, and OpenCode tolerance has been tested. Use an external registry:

```yaml
version: 1
entries:
  show-production-lifecycle:
    kind: capability-skill
    disposition: thin-wrapper
    authority: procedural
    knowledge_sources:
      - knowledge/domain/show-production-lifecycle.md
    lifecycle_stage:
      - orient
      - implement
      - review
    implicit: true
    migration_status: planned
```

The validator should enforce:

- every skill directory has one registry entry;
- no registry entry points to a missing source;
- workflow wrappers point to existing workflows;
- presentation modes are explicit-only;
- reasoning interventions declare lifecycle timing;
- extracted knowledge paths exist;
- capability and review skills declare or select knowledge sources;
- no two sources claim canonical authority for the same facts.

Until that validator exists, this document is the reviewed inventory and must be updated when classifications change.

## Migration Waves

### Wave 0 — taxonomy, operating model, and inventory

- Define content classes and admission rules.
- Define the target reasoning lifecycle and catalog targets.
- Record all 94 current entries.
- Update skill-authoring guidance to reject knowledge-shaped additions.
- Do not move live content.

### Wave 1 — reasoning timing and mode correction

- Move zoom-out behavior into automatic orientation and impact-analysis gates.
- Replace grill behavior with bounded decision challenge.
- Move domain contradiction checks into orientation and review.
- Keep caveman as presentation-only and explicit.
- Add representative routing tests for each lifecycle intervention.

### Wave 2 — classification registry and validator

- Add the external registry.
- Validate coverage, lifecycle stage, invocation policy, destinations, links, and authority.
- Include classification state in generated indexes without making knowledge invocable.

### Wave 3 — three representative knowledge splits

1. `frontend-tech-stack` → engineering-stack knowledge plus a thin or retired skill.
2. `design-patterns` → architecture-pattern knowledge plus focused pattern-selection/review procedures.
3. `show-production-lifecycle` → OKF domain concept plus thin change-impact and implementation routing.

Land each extraction with the skill or reasoning consumer that retrieves and applies the new source. Verify the same representative tasks with Claude Code, Codex, and OpenCode before removing duplicated text.

### Wave 4 — workflow and review reconciliation

- Move authoritative multi-step procedures under `.agents/workflows/`.
- Keep thin discovery wrappers only where needed.
- Resolve engineering review and skill-authoring clusters.
- Select review lenses from change signals.

### Wave 5 — broader pattern extraction

- Extract controller/service/repository, database, frontend, testing, and UI pattern knowledge.
- Thin implementation skills so they select rather than duplicate patterns.
- Review feature and domain skills as canonical OKF sources mature.

### Wave 6 — platform and publication alignment

- Align AI platform skills with the eventual `infra/` migration.
- Update QMD collections and Open WebUI publication paths.
- Preserve access, stable IDs, and citations.

### Wave 7 — catalog consolidation

- Reach the first <=50 implicit milestone.
- Remove obsolete wrappers and overlapping triggers.
- Target <=35 implicit entries after evidence shows routing remains reliable.

## Acceptance Criteria for Each Migration

A migrated entry is complete only when:

- the task routes correctly in Claude Code, Codex, and OpenCode;
- reasoning interventions occur at the intended lifecycle gate;
- `SKILL.md` is procedural and materially smaller when knowledge was extracted;
- canonical knowledge has appropriate OKF or documentation metadata;
- the consumer skill selects the extracted source without requiring the user to name it;
- stable links and source provenance are preserved;
- old duplicate authority is removed or explicitly marked transitional;
- presentation modes do not alter reasoning, warning, or verification behavior;
- `pnpm agents:validate`, classification validation, and Markdown-link validation pass;
- the registry or this inventory records the final disposition.
