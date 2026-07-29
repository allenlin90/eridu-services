# Agent Content Reorganization

## Status

This is a provisional migration inventory for the 94 entries currently indexed under `.agents/skills/`. It establishes review and bookkeeping scope; it does not declare every provisional classification final.

The inventory must be refined through small migrations. A content move is complete only when routing, links, validation, and behavior have been verified with Claude Code, Codex, and OpenCode.

See [`.agents/README.md`](../../.agents/README.md) for the content taxonomy and skill admission test.

## Why Reorganize

The current skill directory combines several different concerns:

- genuine task procedures;
- thin wrappers around repository workflows;
- explicitly requested interaction modes;
- architecture and technology references;
- current domain state;
- duplicated review doctrine;
- client routing surfaces.

This weakens retrieval because every entry competes in the skill catalog even when it is not a task capability. It also makes knowledge difficult to govern because factual content inherits a skill lifecycle rather than an OKF or documentation lifecycle.

Examples of obvious shape mismatch:

- [`frontend-tech-stack`](../../.agents/skills/frontend-tech-stack/SKILL.md) is primarily a technology/version and project-structure reference.
- [`design-patterns`](../../.agents/skills/design-patterns/SKILL.md) is primarily repository architecture doctrine.
- [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) is primarily a domain model, lifecycle state, current surfaces, and known gaps.

These may still need a discoverable skill wrapper, but their facts should not remain embedded as the only canonical copy inside `SKILL.md`.

## Provisional Inventory

| Disposition | Count | Meaning |
| --- | ---: | --- |
| Keep as procedural skill | 67 | Appears task-triggered and procedural; still subject to normal quality review |
| Thin skill plus extracted knowledge | 8 | Mixed or predominantly factual; retain only routing/procedure in the skill |
| Workflow wrapper | 9 | Invocation surface may remain a skill, but authoritative procedure should live under `.agents/workflows/` |
| Explicit mode | 4 | Must not be implicitly invoked; location and client representation need a separate decision |
| Consolidation review | 6 | Overlaps another capability enough that boundaries should be reviewed before further expansion |
| **Total** | **94** | Matches the generated skill index at the time of this audit |

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

This category means “not an obvious move candidate,” not “already ideal.” Each skill still needs a procedural-body, trigger, duplication, and reference review.

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
  trigger + source selection + task workflow + verification

knowledge/... or docs/...
  canonical architecture, domain concepts, current state, policies, and lifecycle facts

references/...
  implementation details needed only after selecting the skill
```

The first migration pilot should use `frontend-tech-stack`, `design-patterns`, and `show-production-lifecycle` because they represent three different knowledge classes: engineering stack, architecture doctrine, and business-domain lifecycle.

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

A wrapper may remain under `.agents/skills/` for cross-client discoverability. Its body should route to one authoritative workflow and avoid maintaining a second copy of the steps.

Review whether `schedule-continuity-workflow` should join this category after inspecting whether its reusable implementation procedure is independent of the orchestration flow.

### Explicit modes

- `caveman`
- `grill-me`
- `grill-with-docs`
- `zoom-out`

These are interaction modes, not implementation capabilities. During migration they may remain manually invoked skills for compatibility, but they should:

- disable implicit invocation for every supported client where possible;
- be excluded from generic coding-capability recommendations;
- avoid competing with engineering skills in default routing;
- eventually use a dedicated mode registry if the clients can consume one consistently.

### Consolidation review

#### Engineering review cluster

- `code-quality`
- `engineering-best-practices-enforcer`
- `improve-codebase-architecture`
- `solid-principles`

These need sharper boundaries among tooling/configuration, repository-convention audit, architecture discovery, and explicit SOLID review. The result may be four thin skills, fewer consolidated skills, or one router with focused references. Do not expand them independently until the boundary review is complete.

#### Skill-authoring cluster

- `eridu-skill-creator`
- `write-a-skill`

Prefer one repository-authoritative skill-creation workflow with optional generic references. Two trigger surfaces are justified only if they have distinct outputs and non-overlapping use cases.

## Additional Clusters to Inspect

These are not provisional merge decisions, but they deserve focused duplication review:

- `admin-list-pattern`, `studio-list-pattern`, and `table-view-pattern`;
- `doc-hygiene`, `doc-lifecycle`, `knowledge-sync`, `monorepo-doc-layering`, and `user-facing-docs`;
- `frontend-code-quality`, `code-quality`, and `engineering-best-practices-enforcer`;
- `ai-workspace-control-plane`, the Open WebUI skills, LiteLLM skills, and the future `infra/` documentation;
- feature-specific pattern skills whose current-state facts already exist in `docs/features/`, `docs/domain/`, or app documentation.

## Proposed Content Metadata

Do not add repository-specific frontmatter fields to all skills until Claude Code, Codex, and OpenCode tolerance has been tested. The preferred next bookkeeping mechanism is a machine-readable registry outside individual `SKILL.md` frontmatter, for example:

```yaml
version: 1
entries:
  show-production-lifecycle:
    kind: skill
    disposition: thin-wrapper
    authority: procedural
    knowledge_sources:
      - knowledge/domain/show-production-lifecycle.md
    migration_status: planned
```

A later validator should enforce:

- every skill directory has one registry entry;
- no registry entry points to a missing skill;
- workflow wrappers point to an existing workflow;
- explicit modes are non-implicit where adapter support exists;
- extracted knowledge paths exist;
- no two sources claim canonical authority for the same content.

Until that validator exists, this document is the reviewed inventory and must be updated when the classification changes.

## Migration Waves

### Wave 0 — taxonomy and inventory

- Define content classes and skill admission rules.
- Record all 94 current entries.
- Update skill-authoring guidance to reject knowledge-shaped additions.
- Do not move live content.

### Wave 1 — three representative splits

1. `frontend-tech-stack` → engineering-stack concept/reference plus a thin or retired skill.
2. `design-patterns` → canonical architecture doctrine plus a focused decision/review procedure.
3. `show-production-lifecycle` → OKF domain concept plus a thin change-impact skill.

Verify the same representative tasks with Claude Code, Codex, and OpenCode before removing duplicated text.

### Wave 2 — workflow wrappers and modes

- Move authoritative multi-step procedures under `.agents/workflows/`.
- Keep only discoverable wrapper skills where required.
- Mark all modes explicit-only and decide whether a portable mode registry is feasible.

### Wave 3 — overlap consolidation

- Resolve the engineering review and skill-authoring clusters.
- Review documentation-lifecycle and table/list-pattern overlaps.
- Reduce redundant catalog entries without creating one oversized catch-all skill.

### Wave 4 — feature and platform extraction

- Split mixed feature/domain skills as canonical knowledge sources mature.
- Align AI platform skills with the eventual `infra/` migration.
- Update QMD collections and Open WebUI publication paths.

### Wave 5 — enforce bookkeeping

- Add a machine-readable classification registry.
- Validate coverage, destinations, links, and authority.
- Include classification state in the generated capability index without making non-skills invocable.

## Acceptance Criteria for Each Migration

A migrated entry is complete only when:

- the task trigger still routes correctly in Claude Code, Codex, and OpenCode;
- `SKILL.md` is procedural and materially smaller when knowledge was extracted;
- canonical knowledge has appropriate OKF or documentation metadata;
- stable links and source provenance are preserved;
- old duplicate authority is removed or explicitly marked transitional;
- `pnpm agents:validate` and Markdown-link validation pass;
- the inventory or future registry records the final disposition.
