export const meta = {
  name: 'doc-skill-sync-audit',
  description: 'Audit .agents skills/workflows/rules and docs/PRDs against current code; fix drift, generalize implementation details, retire shipped specs',
  phases: [
    { title: 'Skills Audit', detail: 'Haiku review + Sonnet fix across 74 skills in 10 batches' },
    { title: 'Workflows & Rules Audit', detail: 'Haiku review + Sonnet fix for .agents/workflows and .agents/rules' },
    { title: 'Misc Docs Audit', detail: 'Haiku review + Sonnet fix for engineering/workflow docs and READMEs; retire shipped superpowers spec' },
    { title: 'PRD & Roadmap Sync', detail: 'Verify and fix doc-drift items identified in the implementation audit' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    has_issues: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          type: { type: 'string', enum: ['stale-fact', 'implementation-detail', 'broken-reference', 'outdated-pattern', 'retire-candidate'] },
          description: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['file', 'type', 'description', 'evidence'],
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
    clean_files: { type: 'array', items: { type: 'string' } },
  },
  required: ['has_issues', 'findings', 'suggestions', 'clean_files'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    files_changed: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' } },
  },
  required: ['files_changed', 'summary', 'suggestions', 'skipped'],
}

const CONVENTIONS = `Project conventions (from AGENTS.md — apply these, don't restate them):
- Skills live in .agents/skills/<name>/SKILL.md (+ optional references/ subfolder). They must stay generic; avoid recording implementation details (specific file paths, line numbers, function/class names, LOC counts, inlined code snapshots) unless the reference is a stable, foundational convention AGENTS.md itself establishes (e.g. "use task.service.ts as the reference implementation").
- A common failure mode: a skill describes a pattern that was aspirational/planned, and the code has since implemented it differently — or the code evolved and the skill's snapshot is now stale.
- docs/ holds product docs: domain/, engineering/, features/, prd/ (committed requirements only), roadmap/ (PHASE_1..5.md), ideation/ (uncommitted, trigger-dependent, or future scope), tech-debt/, workflows/, and superpowers/specs + superpowers/plans (transient execution aids retired per .agents/skills/doc-lifecycle/SKILL.md).
- This is a documentation-only audit: never edit application/source code, only files under .agents/ and docs/ (markdown/.mdc).`

function reviewPrompt(files, codeHints, extraNote) {
  return `You are auditing eridu-services markdown files (skills/workflows/rules/docs) for drift against the current codebase. The repo root is the current working directory.

${CONVENTIONS}

Read these files in full:
${files.map((f) => `- ${f}`).join('\n')}
If any of these is a skill file (.agents/skills/<name>/SKILL.md), also check for a sibling references/ subfolder (run \`find .agents/skills/<name>/references -type f\`) and read any files found there.

Relevant code/doc areas to cross-check against: ${codeHints}
${extraNote ? '\n' + extraNote + '\n' : ''}
For every file, identify:
1. "implementation-detail" — passages pinned to a specific file path, line number, exact function/class/variable name, LOC count, or an inlined code snippet mirroring a current implementation snapshot that will go stale. Flag for generalization (this applies to skills/workflows/rules — docs/ content describing actual shipped behavior is expected to be specific and should NOT be flagged for this).
2. "stale-fact" / "outdated-pattern" — a statement that no longer matches the current code or current doc/roadmap state (renamed, removed, restructured, status changed since the doc was written).
3. "broken-reference" — a path to another file (skill, doc, or code) that no longer exists.
4. "retire-candidate" — a design spec/PRD whose described work has fully shipped and, per .agents/skills/doc-lifecycle/SKILL.md, should be retired.

Do not flag accurate content, stylistic choices, or stable cross-references between skills/AGENTS.md/docs. For every finding, give exact evidence: quote the passage and cite the current code/doc file:line (or state the referenced path doesn't exist). If something seems missing but isn't a misstatement, add a one-line note to "suggestions" — do not draft the content. List every reviewed file that has zero issues in "clean_files".`
}

function phase4ReviewPrompt(files, context) {
  return `You are verifying potential doc-vs-code drift in eridu-services PRD/domain docs that were flagged by a prior implementation audit. The repo root is the current working directory.

${CONVENTIONS}

Files to check:
${files.map((f) => `- ${f}`).join('\n')}

Audit findings to verify (from docs/eridu-services-implementation-audit.md — this audit may itself be stale or already acted on, so re-verify against current code/docs rather than trusting it blindly):
${context}

Read the listed doc file(s) in full, then verify each audit point against the current code with grep/read. For each CONFIRMED mismatch between the doc text and current code/status, produce a finding (type "stale-fact", "outdated-pattern", or "retire-candidate" as appropriate) quoting the exact doc passage plus current code evidence. If a doc already correctly reflects the current state (the audit point is stale or was already fixed), do NOT produce a finding for it — put the file in "clean_files" if nothing else is wrong with it. Use "suggestions" only for things that should probably be documented but aren't (do not draft the content).`
}

function fixPrompt(review) {
  return `You are fixing drift issues found in eridu-services markdown files, on branch docs/skill-doc-code-sync-audit.

${CONVENTIONS}

A reviewer found these issues:
${JSON.stringify(review.findings, null, 2)}

For each finding:
- "stale-fact" / "outdated-pattern" / "broken-reference": re-verify against current code/docs (grep/read), then correct the text in the named file to match reality.
- "implementation-detail": rewrite the flagged passage to describe the pattern/convention generically, dropping the brittle specific (path/line/snippet/LOC count) — unless that would make the guidance meaningless, in which case keep only the minimum needed.
- "retire-candidate": read .agents/skills/doc-lifecycle/SKILL.md and .agents/skills/doc-lifecycle/references/bookkeeping.md, then follow the retirement procedure for that artifact type (e.g. Planning Artifact Retirement, Design Doc Promotion). Capture any still-useful durable decision in its proper home BEFORE deleting, per that procedure — but do not invent new sections elsewhere; only fold in content the spec/PRD itself already states.

Hard constraints:
- Only touch files under .agents/ or docs/ (markdown/.mdc). Never edit application/source code, configs, or anything else.
- Surgical edits only: correct/remove/generalize/retire EXISTING text. Do NOT add new sections or substantial new content. If a finding implies new content is genuinely needed, skip the edit and add a one-line note to "suggestions" instead.
- Match each file's existing tone, structure, and formatting conventions.
- If, on closer inspection, a finding turns out to be incorrect or already fixed, skip it and explain why in "skipped".

Return files_changed (paths actually edited/deleted), summary (what changed and why), suggestions, skipped.`
}

const SKILL_BATCHES = [
  {
    name: 'backend-core',
    files: [
      '.agents/skills/service-pattern-nestjs/SKILL.md',
      '.agents/skills/repository-pattern-nestjs/SKILL.md',
      '.agents/skills/backend-controller-pattern-nestjs/SKILL.md',
      '.agents/skills/orchestration-service-nestjs/SKILL.md',
      '.agents/skills/authentication-authorization-nestjs/SKILL.md',
      '.agents/skills/erify-authorization/SKILL.md',
      '.agents/skills/backend-large-file-refactor/SKILL.md',
    ],
    codeHints: 'apps/erify_api/src/modules/tasks/ (task.service.ts, task-orchestration.service.ts as the canonical reference per AGENTS.md), apps/erify_api/src/modules/studio-membership/, apps/erify_api/src/common/guards/ and decorators (StudioProtected, AdminProtected, JwtAuth ordering), apps/erify_api/src/common/.',
  },
  {
    name: 'backend-data-infra',
    files: [
      '.agents/skills/database-patterns/SKILL.md',
      '.agents/skills/soft-delete-restore/SKILL.md',
      '.agents/skills/data-validation/SKILL.md',
      '.agents/skills/environment-configuration-zod/SKILL.md',
      '.agents/skills/jsonb-analytics-snapshot/SKILL.md',
      '.agents/skills/local-database-cli/SKILL.md',
      '.agents/skills/data-compatibility-migration/SKILL.md',
    ],
    codeHints: 'apps/erify_api/prisma/schema.prisma and prisma/migrations/, repository implementations under apps/erify_api/src/modules/*/*.repository.ts (soft-delete, transactions, bulk ops, optimistic locking), apps/erify_api/src/config/ (Zod env validation), apps/eridu_auth equivalents where referenced.',
  },
  {
    name: 'backend-specialized',
    files: [
      '.agents/skills/api-performance-optimization/SKILL.md',
      '.agents/skills/backend-testing-patterns/SKILL.md',
      '.agents/skills/observability-logging/SKILL.md',
      '.agents/skills/fact-extraction-pipeline/SKILL.md',
      '.agents/skills/template-system-fact-migration/SKILL.md',
      '.agents/skills/file-upload-presign/SKILL.md',
    ],
    codeHints: 'apps/erify_api/src/modules/fact-extraction/ (fact-extraction.service.ts), apps/erify_api/src/modules/task-templates/, apps/erify_api/src/**/*.spec.ts for testing patterns, apps/erify_api/src/common/ for logging/interceptors, the file-upload/presign module under apps/erify_api/src/modules/.',
  },
  {
    name: 'frontend-core',
    files: [
      '.agents/skills/frontend-tech-stack/SKILL.md',
      '.agents/skills/frontend-api-layer/SKILL.md',
      '.agents/skills/frontend-state-management/SKILL.md',
      '.agents/skills/frontend-error-handling/SKILL.md',
      '.agents/skills/frontend-code-quality/SKILL.md',
      '.agents/skills/frontend-testing-patterns/SKILL.md',
      '.agents/skills/frontend-performance/SKILL.md',
    ],
    codeHints: 'apps/erify_studios/src/ and apps/erify_creators/src/ — API/service layer, TanStack Query hooks and query-key factories, error boundaries, vitest configs and *.test.tsx files, vite config, package.json scripts.',
  },
  {
    name: 'frontend-ui-feature',
    files: [
      '.agents/skills/frontend-ui-components/SKILL.md',
      '.agents/skills/frontend-i18n/SKILL.md',
      '.agents/skills/pwa-best-practices/SKILL.md',
      '.agents/skills/table-view-pattern/SKILL.md',
      '.agents/skills/admin-list-pattern/SKILL.md',
      '.agents/skills/studio-list-pattern/SKILL.md',
    ],
    codeHints: 'packages/ui/src/, packages/i18n/, apps/erify_studios/src/features/ list/table view components, PWA manifest/service-worker config in apps/erify_studios and apps/erify_creators.',
  },
  {
    name: 'domain-feature-workflows',
    files: [
      '.agents/skills/schedule-continuity-workflow/SKILL.md',
      '.agents/skills/shift-schedule-pattern/SKILL.md',
      '.agents/skills/task-template-builder/SKILL.md',
      '.agents/skills/spreadsheet/SKILL.md',
      '.agents/skills/operations-review-surface/SKILL.md',
    ],
    codeHints: 'apps/erify_api/src/modules/schedules/, apps/erify_api/src/modules/studio-shifts/, apps/erify_api/src/modules/task-templates/ (template builder/versioning), apps/erify_studios/src/features/task-templates, task-review, show-run-review.',
  },
  {
    name: 'architecture',
    files: [
      '.agents/skills/shared-api-types/SKILL.md',
      '.agents/skills/design-patterns/SKILL.md',
      '.agents/skills/solid-principles/SKILL.md',
      '.agents/skills/domain-refactor-cutover-strategy/SKILL.md',
      '.agents/skills/package-extraction-strategy/SKILL.md',
      '.agents/skills/improve-codebase-architecture/SKILL.md',
    ],
    codeHints: 'packages/api-types/src/, package.json export maps across packages/* (per AGENTS.md monorepo package rules), overall apps/ and packages/ structure.',
  },
  {
    name: 'docs-platform',
    files: [
      '.agents/skills/astro-starlight-best-practices/SKILL.md',
      '.agents/skills/eridu-docs-information-architecture/SKILL.md',
      '.agents/skills/monorepo-doc-layering/SKILL.md',
      '.agents/skills/ssr-auth-integration/SKILL.md',
      '.agents/skills/user-facing-docs/SKILL.md',
      '.agents/skills/doc-hygiene/SKILL.md',
    ],
    codeHints: 'apps/eridu_docs/ (astro.config, src/content/, middleware for SSR auth), the docs/ directory structure and existing doc layering described in monorepo-doc-layering.',
  },
  {
    name: 'security-quality-process',
    files: [
      '.agents/skills/secure-coding-practices/SKILL.md',
      '.agents/skills/eridu-security-threat-model/SKILL.md',
      '.agents/skills/code-quality/SKILL.md',
      '.agents/skills/engineering-best-practices-enforcer/SKILL.md',
      '.agents/skills/agent-instruction-maintenance/SKILL.md',
      '.agents/skills/plan-workflow-completeness/SKILL.md',
      '.agents/skills/pr-ready/SKILL.md',
      '.agents/skills/repository-health/SKILL.md',
      '.agents/skills/knowledge-sync/SKILL.md',
      '.agents/skills/eridu-skill-creator/SKILL.md',
      '.agents/skills/write-a-skill/SKILL.md',
    ],
    codeHints: 'these are largely process/methodology skills — only check for eridu-specific implementation claims (paths under .agents/, apps/, packages/, AGENTS.md references, skill counts) that have drifted; otherwise confirm clean.',
  },
  {
    name: 'generic-tooling',
    files: [
      '.agents/skills/tdd/SKILL.md',
      '.agents/skills/caveman/SKILL.md',
      '.agents/skills/diagnose/SKILL.md',
      '.agents/skills/grill-me/SKILL.md',
      '.agents/skills/grill-with-docs/SKILL.md',
      '.agents/skills/eridu-playwright/SKILL.md',
      '.agents/skills/prod-data-sync/SKILL.md',
      '.agents/skills/prototype/SKILL.md',
      '.agents/skills/to-issues/SKILL.md',
      '.agents/skills/to-prd/SKILL.md',
      '.agents/skills/triage/SKILL.md',
      '.agents/skills/zoom-out/SKILL.md',
      '.agents/skills/setup-matt-pocock-skills/SKILL.md',
    ],
    codeHints: 'mostly generic/methodology skills — check only for eridu-specific implementation claims (paths, tool names, prod-data-sync scripts under apps/erify_api or scripts/, Playwright config) that have drifted; otherwise confirm clean.',
  },
]

const WORKFLOW_RULE_BATCHES = [
  {
    name: 'workflows-a',
    files: [
      '.agents/skills/doc-lifecycle/SKILL.md',
      '.agents/skills/doc-lifecycle/references/bookkeeping.md',
      '.agents/workflows/feature-version-cutover.md',
      '.agents/workflows/ideation-lifecycle.md',
      '.agents/workflows/integration-pr-delivery.md',
      '.agents/workflows/knowledge-sync.md',
      '.agents/workflows/plan-completeness-audit.md',
      '.agents/workflows/pr-review.md',
      '.agents/workflows/prod-data-sync.md',
    ],
    codeHints: 'verify referenced skills, workflows, and docs exist; lifecycle guidance consistently keeps committed requirements in docs/prd/, uncommitted scope in docs/ideation/, and Superpowers specs/plans as transient execution aids; integration PR delivery must remain an overlay on the same lifecycle.',
  },
  {
    name: 'workflows-b-and-rules',
    files: [
      '.agents/workflows/pwa-migration.md',
      '.agents/workflows/ui-ux-pro-max.md',
      '.agents/workflows/verification.md',
      '.agents/rules/01-general-agent-guidelines.mdc',
      '.agents/rules/02-erify-api-guide.mdc',
      '.agents/rules/03-monorepo-packages.mdc',
      '.agents/rules/documentation.md',
    ],
    codeHints: 'verify referenced .agents/skills/<name> directories exist, referenced apps/* paths and package.json conventions in packages/* still hold, and that verification commands (lint/typecheck/test/build) match what package.json scripts in apps/erify_api, apps/eridu_auth, apps/erify_studios, apps/erify_creators actually define.',
  },
]

const MISC_DOC_BATCHES = [
  {
    name: 'engineering-docs',
    files: [
      'docs/engineering/FINANCE_GUARDRAILS.md',
      'docs/engineering/ARCHITECTURE_OVERVIEW.md',
      'docs/engineering/README.md',
      'docs/engineering/DATA_TABLE_EXTRACTION.md',
      'docs/engineering/DB_MIGRATION_POLICY.md',
      'docs/README.md',
    ],
    codeHints: 'overall apps/ and packages/ structure for ARCHITECTURE_OVERVIEW.md, apps/erify_api/prisma/migrations/ + AGENTS.md migration rules for DB_MIGRATION_POLICY.md, finance/compensation code under apps/erify_api/src/modules/ for FINANCE_GUARDRAILS.md, and the actual docs/ subdirectory listing for docs/README.md\'s index.',
    extraNote: undefined,
  },
  {
    name: 'workflow-docs',
    files: [
      'docs/workflows/shift-operations.md',
      'docs/workflows/README.md',
      'docs/workflows/task-and-operations-review.md',
      'docs/workflows/creator-operations.md',
    ],
    codeHints: 'apps/erify_api/src/modules/studio-shifts/ for shift-operations.md, task-review/show-run-review modules for task-and-operations-review.md, and creator-mapping/studio-creator-roster for creator-operations.md.',
  },
  {
    name: 'domain-and-index-docs',
    files: [
      'docs/domain/BUSINESS.md',
      'docs/domain/economics-cost-model.md',
      'docs/features/README.md',
      'docs/prd/README.md',
      'docs/roadmap/README.md',
      'docs/tech-debt/README.md',
      'docs/ideation/README.md',
    ],
    codeHints: 'apps/erify_api/src/modules/studio-costs/, compensation-line-items, and apps/erify_studios/src/features/me (me-show-compensations, me-shift-compensations) to verify whether "Wave 2" cost-stack work described as "in progress" is actually shipped and routed; and the actual docs/features, docs/prd, docs/roadmap, docs/tech-debt, docs/ideation directory listings for each README\'s index accuracy.',
    extraNote: `Special context: .agents/skills/doc-lifecycle/references/bookkeeping.md defines promotion to docs/domain/ for stable semantic contracts. Check whether docs/domain/economics-cost-model.md and docs/domain/BUSINESS.md still describe the cost-stack/compensation work (line items, economics service, costs dashboard, /me compensation self-views) as "Wave 2 in progress" even though it is implemented and routed in code — if so this is a stale-fact (status should reflect current behavior rather than planning state).`,
  },
]

const PRD_ITEMS = [
  {
    name: 'eridu-docs-roles',
    files: ['docs/features/eridu-docs-knowledge-base.md'],
    context: `"Auth & RBAC" gap: "eridu_docs grants identical content to every authenticated user; onboarding doc lists only 6 roles, omitting ACCOUNT_MANAGER" (improvement/doc-drift). Find the eridu_docs onboarding content (search apps/eridu_docs/src/content for an onboarding doc that enumerates studio roles) and the canonical STUDIO_ROLE list (packages/api-types — should be 7 roles including ACCOUNT_MANAGER, added in PR 20.1). Check whether docs/features/eridu-docs-knowledge-base.md's description of role coverage / "Not Covered" content is accurate, and whether it still frames role-based document access as "Auth first, authz later" future work consistent with the current eridu_docs middleware (authentication-only, no per-role content gating).`,
  },
  {
    name: 'rbac-roles-doc',
    files: ['docs/features/rbac-roles.md'],
    context: `Two "Auth & RBAC" / "Task Templates & Lifecycle" findings:
1. doc-drift: "studio-task.controller.ts uses class-level @StudioProtected([ADMIN]) with no MANAGER override, while STUDIO_ROUTE_ACCESS gates the task-setup 'shows' key to MANAGER+ADMIN" — check whether docs/features/rbac-roles.md documents task generate/assign/reassign endpoints as ADMIN+MANAGER when the controller guard in apps/erify_api/src/modules/tasks (studio-task controller) is actually ADMIN-only.
2. "Wiring DESIGNER and MODERATION_MANAGER to role-specific feature gating (reserved placeholder roles)" — confirm docs/features/rbac-roles.md's description of DESIGNER and MODERATION_MANAGER access matches the current STUDIO_ROUTE_ACCESS map in apps/erify_studios (DESIGNER should have no differentiated access beyond MEMBER; MODERATION_MANAGER should only gate taskReports), and that the doc lists all 7 STUDIO_ROLE values including ACCOUNT_MANAGER.`,
  },
  {
    name: 'economics-cost-model-status',
    files: ['docs/domain/economics-cost-model.md', 'docs/domain/BUSINESS.md'],
    context: `"Compensation & Costs" doc-drift: "Costs dashboard and creator/operator compensation self-views noted as Wave 2 'in progress' in docs/domain but shipped in code... the cost-model PRD should be retired/promoted per doc-lifecycle". Verify against apps/erify_api/src/modules/studio-costs, compensation-line-items, and apps/erify_studios/src/features/me (me-show-compensations, me-shift-compensations) — these should be implemented and routed. If docs/domain/economics-cost-model.md or docs/domain/BUSINESS.md still mark this work as "in progress" / "Wave 2" / "planned", that's a stale-fact needing a status update to reflect shipped state.`,
  },
  {
    name: 'client-mechanics-shipped-status',
    files: ['docs/features/client-mechanics.md'],
    context: `Client Mechanics Phase 4 PR 20.1–20.8 is shipped: catalog and ACCOUNT_MANAGER foundation, management UI, money-redacted read paths, template-to-client binding, Loop × Mechanic assignment, bidirectional coverage, and backfill. Cross-check the feature doc against apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md and the implemented API/frontend surfaces. Verify it links to the current app doc and contains no stale language that presents shipped scope as an active PRD or unfinished plan.`,
  },
  {
    name: 'studio-reference-prds-status',
    files: ['docs/prd/studio-reference-data.md', 'docs/prd/studio-creator-profile.md'],
    context: `"Reference Data" / "Creator Roster & Mapping" findings, both marked "Active PRD — Phase 5 candidate; not implemented":
1. docs/prd/studio-reference-data.md describes studio-initiated reference-data creation/update via POST/PATCH /studios/:studioId/* (clients, platforms, show-types/standards/statuses) tracked by createdByStudioId with 409 DUPLICATE_NAME / 403 UPDATE_NOT_PERMITTED — confirm no such studio-scoped write endpoints exist in apps/erify_api/src/modules (reference-data CRUD should still be admin-only under /admin/*).
2. docs/prd/studio-creator-profile.md describes PATCH /studios/:studioId/creators/:creatorId/profile for studio ADMIN to edit global Creator name/aliasName/metadata and conditional userId linking — confirm this route does not exist in the studio-creator controller in apps/erify_api.
For both, verify the PRD's status header accurately says this is planned/not-yet-implemented (Phase 5 candidate) rather than implying it's done.`,
  },
  {
    name: 'uncommitted-prd-placement',
    files: [
      'docs/prd/future/member-actuals-attestation.md',
      'docs/prd/future/pnl-revenue-workflow.md',
      'docs/prd/future/studio-schedule-management.md',
    ],
    context: `These documents currently live in the legacy docs/prd/future/ location. The canonical lifecycle reserves docs/prd/ for committed requirements and docs/ideation/ for uncommitted, trigger-dependent, or future scope.
1. member-actuals-attestation.md: member self-attest of shift actualStartTime/actualEndTime with per-timestamp source attribution — confirm /me shift/show-compensation endpoints in apps/erify_api remain read-only (no member-write attestation path), and that the "flag missing actuals" affordance described as "Planned but absent" in PR 10 is indeed absent from /me or studio-shifts code.
2. pnl-revenue-workflow.md: revenue input (GMV/net_sales) per ShowPlatform driving commission-cost resolution — confirm no revenue-input UI/commission calculator exists yet, and that COMMISSION/HYBRID costs still resolve to null with COMMISSION_REVENUE_NOT_AVAILABLE in apps/erify_api's compensation calculation code.
3. studio-schedule-management.md: studio-native schedule management (studio-scoped CRUD, publish, duplication) — confirm Schedule CRUD/publish still lives only under /admin/schedules (system-admin / GoogleSheetsApiKeyGuard) with no studio-scoped schedule write endpoints, and that the doc's "Deferred 2026-04-22" status framing is still accurate (not superseded by a later roadmap decision in docs/roadmap/PHASE_5.md).
If a document remains uncommitted, report its placement and any language treating it as a future PRD as an "outdated-pattern" even when its product status is otherwise accurate; preserve actionable discovery when it moves to ideation. If the team has recommitted to it, it needs an active PRD rather than a future bucket.`,
  },
]

function toResultShape(review, fix) {
  if (!review) return { files_changed: [], summary: 'review failed', suggestions: [], skipped: [] }
  if (!review.has_issues) {
    return { files_changed: [], summary: 'no issues found', suggestions: review.suggestions || [], skipped: [] }
  }
  if (!fix) return { files_changed: [], summary: 'fix failed', suggestions: review.suggestions || [], skipped: review.findings.map((f) => f.description) }
  return { ...fix, suggestions: [...(fix.suggestions || []), ...(review.suggestions || [])] }
}

phase('Skills Audit')
const skillResults = await pipeline(
  SKILL_BATCHES,
  (b) => agent(reviewPrompt(b.files, b.codeHints), { phase: 'Skills Audit', label: `review:${b.name}`, model: 'haiku', schema: FINDINGS_SCHEMA }),
  (review, b) => {
    if (review && review.has_issues) {
      log(`skills/${b.name}: ${review.findings.length} finding(s)`)
      return agent(fixPrompt(review), { phase: 'Skills Audit', label: `fix:${b.name}`, schema: FIX_SCHEMA }).then((fix) => toResultShape(review, fix))
    }
    return toResultShape(review, null)
  }
)

phase('Workflows & Rules Audit')
const workflowResults = await pipeline(
  WORKFLOW_RULE_BATCHES,
  (b) => agent(reviewPrompt(b.files, b.codeHints), { phase: 'Workflows & Rules Audit', label: `review:${b.name}`, model: 'haiku', schema: FINDINGS_SCHEMA }),
  (review, b) => {
    if (review && review.has_issues) {
      log(`workflows/${b.name}: ${review.findings.length} finding(s)`)
      return agent(fixPrompt(review), { phase: 'Workflows & Rules Audit', label: `fix:${b.name}`, schema: FIX_SCHEMA }).then((fix) => toResultShape(review, fix))
    }
    return toResultShape(review, null)
  }
)

phase('Misc Docs Audit')
const miscResults = await pipeline(
  MISC_DOC_BATCHES,
  (b) => agent(reviewPrompt(b.files, b.codeHints, b.extraNote), { phase: 'Misc Docs Audit', label: `review:${b.name}`, model: 'haiku', schema: FINDINGS_SCHEMA }),
  (review, b) => {
    if (review && review.has_issues) {
      log(`misc/${b.name}: ${review.findings.length} finding(s)`)
      return agent(fixPrompt(review), { phase: 'Misc Docs Audit', label: `fix:${b.name}`, schema: FIX_SCHEMA }).then((fix) => toResultShape(review, fix))
    }
    return toResultShape(review, null)
  }
)

phase('PRD & Roadmap Sync')
const prdResults = await pipeline(
  PRD_ITEMS,
  (item) => agent(phase4ReviewPrompt(item.files, item.context), { phase: 'PRD & Roadmap Sync', label: `review:${item.name}`, model: 'haiku', schema: FINDINGS_SCHEMA }),
  (review, item) => {
    if (review && review.has_issues) {
      log(`prd/${item.name}: ${review.findings.length} finding(s)`)
      return agent(fixPrompt(review), { phase: 'PRD & Roadmap Sync', label: `fix:${item.name}`, schema: FIX_SCHEMA }).then((fix) => toResultShape(review, fix))
    }
    return toResultShape(review, null)
  }
)

const all = [...skillResults, ...workflowResults, ...miscResults, ...prdResults].filter(Boolean)
const filesChanged = [...new Set(all.flatMap((r) => r.files_changed))]
const suggestions = [...new Set(all.flatMap((r) => r.suggestions))]
const skipped = all.flatMap((r) => r.skipped)
const summaries = all.map((r) => r.summary).filter((s) => s !== 'no issues found')

log(`Done. ${filesChanged.length} file(s) changed, ${suggestions.length} suggestion(s), ${skipped.length} skipped item(s).`)

return { filesChanged, summaries, suggestions, skipped }
