export const meta = {
  name: 'eridu-investigation',
  description: 'Discover docs+code at runtime, mine with haiku, cross-reference 10 fixed business domains with opus, synthesize an audit report with opus',
  whenToUse: 'Use to produce an up-to-date "what does the platform actually do, what is implemented vs planned, who can do what" audit of eridu-services. Re-runnable as docs/code evolve - it discovers the current file tree rather than assuming a fixed layout.',
  phases: [
    { title: 'Discover', detail: '7 haiku agents enumerate docs/ and each app/package into mining chunks', model: 'haiku' },
    { title: 'Mine', detail: 'haiku agents summarize each chunk and self-tag business domain(s)', model: 'haiku' },
    { title: 'Cross-Reference', detail: '10 opus agents, one per fixed business domain, find drift/gaps', model: 'opus' },
    { title: 'Synthesize', detail: '2 opus agents produce the final report sections', model: 'opus' },
  ],
}

const ROOT = '/Users/allenlin/Desktop/projects/eridu-services'
const RO = 'This is a read-only investigation. Do not modify, create, or delete any files. Use Bash (find/ls/grep, read-only) and Read/Glob tools. Be factual and specific (cite file paths, route names, field names). Do not invent details not present in what you read.'

// Tunable chunking targets - adjust if discovery produces too many/few mining tasks.
const TARGET_CHUNK_SIZE = 4 // ~paths per code-discovery chunk
const MAX_DOC_CHUNK = 10 // max files per docs-discovery chunk

// Fixed business-domain taxonomy. This reflects the product's stable business
// model (per user decision) - mining agents self-tag against this list rather
// than the script pre-assigning paths to areas, so it survives doc/code moves.
const AREAS = [
  'auth_rbac', 'reference_data', 'show_scheduling', 'task_templates_lifecycle',
  'operations_review', 'compensation_costs', 'performance_analytics',
  'creator_roster', 'creator_portal', 'member_self_service',
]

const AREA_LABELS = {
  auth_rbac: 'Auth & RBAC',
  reference_data: 'Reference Data (Admin/System)',
  show_scheduling: 'Shows & Scheduling',
  task_templates_lifecycle: 'Task Templates & Task Lifecycle',
  operations_review: 'Operations Review (Submission to Fact Extraction to Review)',
  compensation_costs: 'Compensation & Costs',
  performance_analytics: 'Performance Analytics',
  creator_roster: 'Creator Roster & Mapping',
  creator_portal: 'Creator Portal (erify_creators)',
  member_self_service: 'Member Self-Service',
}

const AREA_DESCRIPTIONS = `  auth_rbac - authentication, JWT/JWKS, StudioMembership roles, route-access guards
  reference_data - admin/system reference entities (clients, platforms, show-standards/statuses/types, studio-rooms, users, shared fields)
  show_scheduling - shows, show-creators, show-platforms, schedules, shifts
  task_templates_lifecycle - task templates (immutable versioning), tasks, task orchestration
  operations_review - task submission, fact extraction, task review/approval, show run review, task reports
  compensation_costs - compensation line items, studio costs, cost model, finance guardrails
  performance_analytics - performance metrics/dashboards
  creator_roster - creator entity, studio creator roster, creator-show mapping
  creator_portal - the erify_creators app and creator-facing /me endpoints
  member_self_service - studio member self-service (my tasks/shifts/compensations), membership management
  all - cross-cutting / infrastructure / general docs not specific to one domain above`

// ---------- Schemas ----------

const MANIFEST_SCHEMA = {
  type: 'object',
  properties: {
    chunks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' } },
        },
        required: ['label', 'paths'],
        additionalProperties: false,
      },
    },
  },
  required: ['chunks'],
  additionalProperties: false,
}

const MINE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    areas: { type: 'array', items: { type: 'string', enum: [...AREAS, 'all'] } },
  },
  required: ['title', 'summary', 'areas'],
  additionalProperties: false,
}

const AREA_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    area_label: { type: 'string' },
    done_features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          feature: { type: 'string' },
          flow: { type: 'string' },
          roles: { type: 'string' },
        },
        required: ['feature', 'flow', 'roles'],
        additionalProperties: false,
      },
    },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule: { type: 'string' },
          where: { type: 'string' },
        },
        required: ['rule', 'where'],
        additionalProperties: false,
      },
    },
    role_access: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          capability: { type: 'string' },
          member: { type: 'string' },
          designer: { type: 'string' },
          moderation_manager: { type: 'string' },
          manager: { type: 'string' },
          talent_manager: { type: 'string' },
          admin: { type: 'string' },
          creator: { type: 'string' },
        },
        required: ['capability', 'member', 'designer', 'moderation_manager', 'manager', 'talent_manager', 'admin', 'creator'],
        additionalProperties: false,
      },
    },
    planned_unimplemented: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          source: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['item', 'source', 'status'],
        additionalProperties: false,
      },
    },
    gaps_and_improvements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          kind: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['issue', 'kind', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['area', 'area_label', 'done_features', 'constraints', 'role_access', 'planned_unimplemented', 'gaps_and_improvements'],
  additionalProperties: false,
}

// ---------- Phase 1: Discover ----------
// Each agent runs `find`/`ls` over one part of the monorepo and groups the
// results into mining chunks. The NUMBER of chunks (and therefore mining
// agents) is whatever the current repo size produces - not hardcoded.

const DISCOVERY_TASKS = [
  {
    key: 'discover_docs',
    prompt: `Run, from ${ROOT}: find docs -type f -name "*.md"

Group the resulting files into chunks of at most ${MAX_DOC_CHUNK} files each:
- Group by the top-level subdirectory under docs/ (e.g. all files under docs/roadmap/ form one group "docs/roadmap"; docs/prd/ including docs/prd/future/ form one group "docs/prd"; docs/ideation/, docs/features/, docs/workflows/, docs/domain/, docs/engineering/, docs/tech-debt/, docs/superpowers/ similarly).
- Files directly in docs/ (e.g. docs/README.md) form a group "docs/root".
- If any group has more than ${MAX_DOC_CHUNK} files, split it into multiple chunks labeled "<group> (1/N)", "<group> (2/N)", etc., each with at most ${MAX_DOC_CHUNK} files.

Return chunks: [{label, paths}], paths relative to ${ROOT} (e.g. "docs/roadmap/PHASE_4.md").`,
  },
  {
    key: 'discover_erify_api',
    prompt: `Run these from ${ROOT}:
- find apps/erify_api/src/admin -maxdepth 1 -type d
- find apps/erify_api/src/studios -maxdepth 1 -type d
- find apps/erify_api/src/orchestration -maxdepth 1 -type d
- find apps/erify_api/src -maxdepth 1 -type d
- ls apps/erify_api/scripts

Build chunks (paths relative to ${ROOT}, target ~${TARGET_CHUNK_SIZE} items per chunk):
- Group the apps/erify_api/src/admin/* directories into chunks of ~${TARGET_CHUNK_SIZE}, labeled "erify_api admin (1/N)" etc.
- Group the apps/erify_api/src/studios/* directories into chunks of ~${TARGET_CHUNK_SIZE}, labeled "erify_api studios (1/N)" etc.
- apps/erify_api/src/orchestration/fact-extraction gets its OWN chunk (it is a large module). The remaining apps/erify_api/src/orchestration/* directories share one chunk.
- From the top-level apps/erify_api/src/* directories, EXCLUDE admin, studios, orchestration (handled above). Group the rest (e.g. me, models, task-orchestration, show-orchestration, schedule-planning, uploads, google-sheets, backdoor, health, lib) into chunks of ~${TARGET_CHUNK_SIZE}.
- One small chunk labeled "erify_api core/infra" containing: apps/erify_api/src/app.module.ts, apps/erify_api/prisma/schema.prisma, and the apps/erify_api/scripts/* files.

Return chunks: [{label, paths}].`,
  },
  {
    key: 'discover_erify_studios',
    prompt: `Run these from ${ROOT}:
- find apps/erify_studios/src/features -maxdepth 1 -type d
- find apps/erify_studios/src/routes -type f -name "*.tsx"
- find apps/erify_studios/src/lib/constants apps/erify_studios/src/lib/hooks apps/erify_studios/src/config -maxdepth 1 -type f

Build chunks (paths relative to ${ROOT}, target ~${TARGET_CHUNK_SIZE} items per chunk):
- Group apps/erify_studios/src/features/* directories into chunks of ~${TARGET_CHUNK_SIZE}, grouping related feature areas together where names suggest a relationship (show-related together, task-related together, creator-related together, admin/reference-related together, cost/performance/compensation-related together).
- Group apps/erify_studios/src/routes/system/*.tsx files into 1-2 chunks.
- Group apps/erify_studios/src/routes/studios/$studioId/**/*.tsx files into 2-3 chunks by related purpose (shows/shifts/schedules together; tasks/templates/reviews together; costs/performance/compensation together; members/creators together).
- Root-level apps/erify_studios/src/routes/*.tsx files form one chunk.
- The lib/constants + lib/hooks + config files form one chunk labeled "erify_studios route-access & config" (these define RBAC route gating and sidebar nav - important for the role matrix).

Return chunks: [{label, paths}].`,
  },
  {
    key: 'discover_erify_creators',
    prompt: `Run, from ${ROOT}: find apps/erify_creators/src -type f

Group into 1-2 chunks total (this app is small) - e.g. one chunk for features/ + pages/, one for routes/ + config/.

Return chunks: [{label, paths}].`,
  },
  {
    key: 'discover_eridu_auth',
    prompt: `Run, from ${ROOT}: find apps/eridu_auth/src -maxdepth 3 -type d

Group into 2-3 chunks: (1) db/schema + migrations, (2) frontend routes + pages, (3) lib + remaining.

Return chunks: [{label, paths}].`,
  },
  {
    key: 'discover_eridu_docs',
    prompt: `Run, from ${ROOT}: find apps/eridu_docs/src -maxdepth 3 -type d

Group into 1-2 chunks covering this Astro/Starlight docs-platform app (content, components, pages/auth, lib).

Return chunks: [{label, paths}].`,
  },
  {
    key: 'discover_packages',
    prompt: `Run, from ${ROOT}: find packages -maxdepth 2 -type d

Group into 1-2 chunks covering all packages (api-types, auth-sdk, browser-upload, ui, i18n, eslint-config, typescript-config). Prioritize api-types, auth-sdk, ui, browser-upload (business-relevant shared code) as one chunk; eslint-config/typescript-config/i18n can share a smaller second chunk.

Return chunks: [{label, paths}].`,
  },
]

phase('Discover')
log('Enumerating docs/ and each app/package to build mining chunks...')
const manifestLists = await parallel(DISCOVERY_TASKS.map(t => () =>
  agent(`${t.prompt}\n\n${RO}`, { label: t.key, phase: 'Discover', model: 'haiku', schema: MANIFEST_SCHEMA })
    .then(r => (r ? r.chunks.map(c => ({ ...c, source: t.key })) : []))
))
const allChunks = manifestLists.flat()
log(`Discovered ${allChunks.length} mining chunks across ${DISCOVERY_TASKS.length} scan roots`)

// ---------- Phase 2: Mine ----------

phase('Mine')
function buildMinePrompt(chunk) {
  const pathList = chunk.paths.map(p => `- ${p}`).join('\n')
  return `Explore these paths under ${ROOT} (read files directly; for directories, list contents and read 1-3 representative files - e.g. controller+service+schema for a backend module, route/index/key component for a frontend feature, the doc file itself for docs):

${pathList}

Produce:
- title: short descriptive label for "${chunk.label}"
- summary (~300-500 words): what is implemented/documented here - entities, endpoints, routes, UI screens and the actions/data they expose; role/permission guards if visible (decorator names, route-access keys); business rules/validations enforced; for docs, what is described as DONE/shipped vs PLANNED/deferred/not-yet-implemented. Cite specific file paths, route names, field names, PR numbers where relevant.
- areas: which business domain(s) this content relates to - pick all that apply from:
${AREA_DESCRIPTIONS}

${RO}`
}

const minedRaw = await parallel(allChunks.map(chunk => () =>
  agent(buildMinePrompt(chunk), { label: chunk.label, phase: 'Mine', model: 'haiku', schema: MINE_SCHEMA })
    .then(r => r && { key: chunk.label, source: chunk.source, title: r.title, summary: r.summary, areas: r.areas })
))
const mined = minedRaw.filter(Boolean)
log(`Mined ${mined.length}/${allChunks.length} chunks`)

// ---------- Phase 3: Cross-Reference ----------

phase('Cross-Reference')
function buildAreaPrompt(area) {
  const label = AREA_LABELS[area]
  const relevant = mined.filter(m => m.areas.includes('all') || m.areas.includes(area))
  const body = relevant.map(m => `### [${m.key}] ${m.title}\n${m.summary}`).join('\n\n---\n\n')
  return `You are auditing the "${label}" business domain of the Eridu Services monorepo (a studio/creator operations platform). Below are factual summaries mined from documentation and source code relevant to this domain.

${body}

---

Based ONLY on the above material, produce a structured analysis for the "${label}" domain. Set area="${area}" and area_label="${label}".

1. done_features: List each DISTINCT shipped feature/capability in this domain. For each: "feature" (short name), "flow" (1-2 sentence description of the user action/flow - what triggers it, what happens), "roles" (which roles/actors can use it, e.g. "MANAGER, ADMIN" or "Creator (self-service)").

2. constraints: List concrete business rules, validations, or policies that ARE enforced in code/docs (e.g. "Task templates are immutable - edits create new versions"). For each: "rule" and "where" (which module/feature it applies to).

3. role_access: For 4-8 KEY capabilities in this domain (e.g. "View X", "Create/Edit X", "Approve/Override X", "Export X"), fill in access for each: member, designer, moderation_manager, manager, talent_manager, admin, creator. Use short values: "Yes", "No", "Own only", "Read-only", or "N/A" (capability doesn't apply to that actor type).

4. planned_unimplemented: List items that PRDs/roadmap/ideation describe as planned, deferred, or not-yet-implemented for this domain, where the code summaries show NO corresponding implementation (real drift/gap, not just a future-phase label already consistent with code). For each: "item", "source" (which doc), "status" (e.g. "Planned - Phase 4 PR 20.x", "Deferred to Phase 5", "Ideation - no decision").

5. gaps_and_improvements: List concrete problems, inconsistencies, or improvement opportunities - e.g. doc says X but code does Y, a missing workflow step, a UX inconsistency, a technical design concern. For each: "issue", "kind" (one of: doc-drift, workflow-gap, ux, technical, improvement), "detail" (1-2 sentences, cite file/route names where possible).

Be precise, factual, concise. Do not invent features not in the source material. If a section has nothing notable, return an empty array for it.`
}

const crossRefRaw = await parallel(AREAS.map(area => () =>
  agent(buildAreaPrompt(area), { label: `xref:${area}`, phase: 'Cross-Reference', model: 'opus', schema: AREA_SCHEMA })
))
const crossRef = crossRefRaw.filter(Boolean)
log(`Cross-referenced ${crossRef.length}/${AREAS.length} business domains`)

// ---------- Phase 4: Synthesize ----------

phase('Synthesize')
const dataset = JSON.stringify(crossRef)

const SYNTH_A_PROMPT = `You are writing two sections of an investigation report on the Eridu Services monorepo for an engineering/product audience.

You are given structured findings from ${crossRef.length} business-domain audits (JSON below). Each domain has: area, area_label, done_features[] (feature/flow/roles), role_access[] (per-capability access for member/designer/moderation_manager/manager/talent_manager/admin/creator).

JSON:
${dataset}

Produce markdown with exactly these two sections:

## 1. Done Features & Flows
For each domain (use area_label as a ### subheading, in the order given), render done_features as a markdown table with columns: Feature | Flow | Roles. Keep descriptions terse (one line each). Skip domains with an empty done_features array.

## 2. Role Capability Matrix
Merge ALL role_access rows from ALL domains into ONE consolidated table, columns: Domain | Capability | Member | Designer | Mod. Manager | Manager | Talent Manager | Admin | Creator. Sort rows by domain (in the order given). This is the primary reference for "who can do/see what" - keep it scannable.

Output ONLY these two sections, no preamble or conclusion.`

const SYNTH_B_PROMPT = `You are writing three sections of an investigation report on the Eridu Services monorepo for an engineering/product audience.

You are given structured findings from ${crossRef.length} business-domain audits (JSON below). Each domain has: area, area_label, constraints[] (rule/where), planned_unimplemented[] (item/source/status), gaps_and_improvements[] (issue/kind/detail).

JSON:
${dataset}

Produce markdown with exactly these three sections:

## 3. Implemented Business Constraints, Policies & Logic
One table, columns: Domain | Rule | Where Enforced. Sort rows by domain (order given). Dedupe near-identical rules across domains.

## 4. Planned / Unimplemented Work (Doc vs Code Drift)
One table, columns: Domain | Item | Source | Status. This is a PRIMARY deliverable - be thorough, include everything from planned_unimplemented across all domains. Sort by domain.

## 5. Gaps, Problems & Improvement Opportunities (secondary priority)
One table, columns: Domain | Issue | Kind | Detail. Sort by domain. Lower priority section - keep it concise.

Output ONLY these three sections, no preamble or conclusion.`

const [partA, partB] = await parallel([
  () => agent(SYNTH_A_PROMPT, { label: 'synth:done-roles', phase: 'Synthesize', model: 'opus' }),
  () => agent(SYNTH_B_PROMPT, { label: 'synth:policy-gaps', phase: 'Synthesize', model: 'opus' }),
])

const header = `# Eridu Services -- Implementation Audit

**Scope:** What the platform does end-to-end today (admin/system, studio operations, member self-service, creator portal), the business rules/policies actually enforced, role-based access across all actor types, and where PRDs/roadmap/ideation describe work that isn't implemented yet.

**Method:** ${allChunks.length} chunks discovered at runtime from docs/ and each app/package, mined in parallel by Haiku, cross-referenced across ${crossRef.length} business domains by Opus, synthesized into this report by Opus.

**Domains covered:** ${AREAS.map(a => AREA_LABELS[a]).join(' / ')}

---`

return [header, partA, partB].filter(Boolean).join('\n\n')
