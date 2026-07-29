# Target Agent Operating Model

## Decision

The target is not a larger collection of narrowly named skills. The target is a small, predictable execution system in which:

- lifecycle and reasoning skills decide **what work to perform next**;
- capability skills perform a concrete task;
- review skills apply a defined lens and produce findings;
- pattern, architecture, domain, and stack guidance live as knowledge or reference material;
- workflows coordinate multiple capabilities;
- presentation modes affect output only and never replace reasoning.

The current `.agents/skills/` catalog is a migration source, not the target information architecture.

## Target Layers

| Layer | Responsibility | Target examples |
| --- | --- | --- |
| Lifecycle | Move a task through orientation, decision, implementation, review, and bookkeeping | orient, plan, implement, review, close |
| Reasoning | Resolve uncertainty, select evidence, compare options, and challenge decisions | context orientation, impact analysis, pattern selection, decision challenge |
| Capability | Execute a concrete repeatable task | implement controller, diagnose regression, configure auth, optimize query |
| Review | Evaluate work through a declared lens | architecture review, security review, performance review, repository-convention review |
| Workflow | Coordinate several skills and repository lifecycle stages | PR readiness, knowledge sync, release, migration, repository health |
| Knowledge | State durable facts, patterns, policies, architecture, and domain concepts | frontend stack, persistence doctrine, show lifecycle, AI platform topology |
| Reference | Provide implementation depth used after a capability is selected | framework examples, command tables, edge cases |
| Presentation mode | Modify communication style after reasoning is complete | compact/caveman output |
| Adapter | Load or expose the shared system to a specific client | Claude, Codex, OpenCode, Cursor, Copilot adapters |

## Canonical Development Flow

Every non-trivial coding task should pass through the following gates. A gate may be brief, but it should not be skipped merely because a matching implementation skill exists.

```text
request
  ↓
1. Orient and bound scope
  ↓
2. Resolve material decisions
  ↓
3. Select knowledge and procedures
  ↓
4. Plan and implement
  ↓
5. Review through relevant lenses
  ↓
6. Verify and reconcile knowledge
  ↓
7. Present the result
```

### 1. Orient and bound scope

Purpose:

- understand the affected domain and runtime;
- identify callers, dependencies, data ownership, and existing decisions;
- determine whether the request is local or cross-cutting;
- prevent premature selection of a familiar pattern.

Automatic intervention:

- use **zoom-out behavior** when the agent lacks sufficient context, the change crosses modules or runtimes, the local implementation appears inconsistent, or the user is asking for architecture rather than a patch;
- inspect code, domain knowledge, ADRs, and relevant history before asking the user questions that repository evidence can answer.

Output:

- a bounded problem statement;
- affected areas and authority sources;
- known constraints and unresolved decisions.

### 2. Resolve material decisions

Purpose:

- distinguish implementation questions from product, domain, architecture, or policy decisions;
- challenge assumptions before code makes them expensive;
- make unresolved tradeoffs visible.

Automatic intervention:

- use **decision-challenge behavior** when two or more credible choices remain and the difference affects public contracts, data ownership, authorization, persistence, deployment, or future migration cost;
- research answerable questions first;
- involve the user only for genuine preference, policy, risk, or business decisions;
- ask questions in dependency order, not as an unbounded interview.

Output:

- decision, rationale, rejected alternatives, and follow-up gates;
- ADR only when the choice is costly to reverse, surprising without context, and based on a real tradeoff.

### 3. Select knowledge and procedures

Purpose:

- load the minimum authoritative material needed for the task;
- avoid making every pattern document compete as an invocable skill.

Selection order:

1. repository rules and local architecture constraints;
2. domain and platform knowledge relevant to the affected area;
3. capability procedure for the concrete work;
4. optional framework references and examples.

Pattern and guide material is selected by reasoning, implementation, or review skills. It should not normally be selected directly by the user or by keyword competition in the global skill catalog.

### 4. Plan and implement

Purpose:

- execute the minimal coherent change;
- use capability skills that contain procedure, selection logic, and verification.

A capability skill should answer:

- when this procedure applies;
- which canonical knowledge must be loaded;
- which steps to execute;
- what evidence proves completion.

It should not restate the complete architecture, domain model, technology stack, or framework manual.

### 5. Review through relevant lenses

Purpose:

- review the result against risks that matter for this change rather than running every checklist on every task.

The lifecycle or planning skill selects review lenses based on change signals:

| Signal | Review lens |
| --- | --- |
| public API, module ownership, cross-capability dependency | architecture review |
| auth, permissions, secrets, uploads, external input | security review |
| query shape, rendering hot path, large data set, repeated calls | performance review |
| repository conventions, dependency or package changes | repository-convention review |
| user-visible route or interaction change | UI and product-flow review |
| schema, compatibility, or migration change | data compatibility review |

Review skills should load pattern knowledge and produce findings. Pattern documents themselves are not review skills.

### 6. Verify and reconcile knowledge

Purpose:

- run technical verification;
- update canonical knowledge when behavior or architecture changed;
- remove obsolete duplicate authority.

Outputs:

- commands and outcomes;
- remaining risks;
- updated docs, knowledge, workflow, rule, or skill routing where required.

### 7. Present the result

Presentation happens after reasoning and verification.

- normal output remains clear and complete;
- **caveman/compact mode** is applied only when explicitly requested by the user;
- presentation modes must not remove warnings, uncertainty, decisions, or verification results;
- presentation mode never controls exploration, planning, implementation, or review behavior.

## Reclassification of Current “Modes”

The four current entries should not remain one category.

| Current entry | Actual function | Target disposition | Trigger timing |
| --- | --- | --- | --- |
| `caveman` | Presentation compression | Explicit presentation mode | Final and intermediate communication only after user request |
| `zoom-out` | Context orientation | Merge into an automatically selected reasoning capability | Before planning when context, scope, or ownership is unclear |
| `grill-me` | Interactive decision challenge | Replace with a bounded decision-challenge procedure | During decision gate when repository evidence cannot resolve a material choice |
| `grill-with-docs` | Domain-language reconciliation plus decision challenge | Merge into decision challenge and domain-model reasoning | During orientation/decision gates when terminology or code contradicts domain knowledge |

### Timing corrections

#### `zoom-out`

Current problem: it is explicit-only and framed as a user-facing response style. That makes it unavailable at the moment an agent should recognize insufficient context.

Target:

- automatically invoked by planning, architecture review, impact analysis, and unfamiliar-area work;
- gathers the system map before proposing changes;
- produces concrete scope and authority sources rather than a generic “big picture” explanation.

#### `grill-me`

Current problem: “interview relentlessly” and one-question-at-a-time behavior can delay work even when the repository contains the answer.

Target:

- challenge only material unresolved decisions;
- inspect code and knowledge first;
- batch independent questions where useful;
- stop when decisions are sufficient to proceed;
- record decisions and rejected alternatives.

#### `grill-with-docs`

Current problem: it duplicates `grill-me`, assumes generic `CONTEXT.md` and ADR layouts, and mixes domain knowledge policy with interaction behavior.

Target:

- domain glossary and terminology rules become knowledge/documentation governance;
- contradiction detection becomes part of orientation and review;
- decision questioning becomes the shared decision-challenge procedure;
- repository-specific documentation locations replace generic assumed paths.

#### `caveman`

Current problem: persistent presentation behavior can leak into warnings, plans, or complex explanations.

Target:

- remain explicit-only;
- apply to response rendering, not internal task flow;
- allow automatic clarity override for safety, destructive operations, decisions, and verification;
- default to turn-scoped unless the user explicitly asks for persistence.

## Pattern and Guide Target

### Principle

A pattern describes **what good implementation looks like in this repository**. That is knowledge. A skill describes **how to complete a particular task using the applicable patterns**.

Pattern and guide entries should move out of the global invocable catalog unless they provide a distinct procedure.

### Target knowledge groups

```text
knowledge/
├── engineering/
│   ├── frontend-stack/
│   ├── backend-architecture/
│   ├── persistence/
│   ├── api-contracts/
│   ├── testing/
│   └── package-architecture/
├── domain/
│   ├── show-production/
│   ├── scheduling/
│   ├── tasks/
│   └── compensation/
└── platform/
    ├── authentication/
    ├── ai-workspace/
    ├── railway/
    └── observability/
```

The final grouping should follow reviewed authority and access boundaries, not this example literally.

### Likely knowledge/reference candidates

These classes should be reviewed for extraction even when a thin implementation skill remains:

- technology-stack and framework guides;
- design, SOLID, controller/service/repository, persistence, and UI patterns;
- domain lifecycle and entity relationship descriptions;
- route conventions and API-shape doctrine;
- testing strategy and quality checklists;
- current platform topology and deployed-version facts;
- feature-specific current surfaces and known gaps.

### Consumer skills

Pattern knowledge should mainly be consumed by a limited set of skills:

1. **context orientation / impact analysis** — identifies relevant knowledge;
2. **pattern selection / design reasoning** — compares applicable approaches;
3. **implementation capability** — performs the concrete change;
4. **review lens** — checks compliance and risk;
5. **knowledge reconciliation** — updates authority after the change.

A user should not need to know that a document named `service-pattern-nestjs` exists in order to request a service implementation. The implementation skill or reasoning layer should load the service pattern automatically.

## Target Skill Portfolio

The reorganization is complete when the catalog is organized by function rather than by every available piece of guidance.

### Target categories

| Category | Target | Notes |
| --- | ---: | --- |
| Lifecycle and reasoning skills | 5–10 | orientation, impact, decision, planning, review routing, close-out |
| Concrete capability skills | 20–40 | implementation, operations, diagnosis, migration, publishing |
| Review lenses | 5–10 | architecture, security, performance, compatibility, UX, conventions |
| Workflow wrappers | As needed, ideally fewer than 10 | thin cross-client routing only |
| Presentation modes | 1–3 | explicit-only; no reasoning responsibility |
| Knowledge/pattern entries in implicit skill catalog | 0 | knowledge is retrieved by consumers, not globally invoked |

The ranges are targets, not quotas. A skill remains only when its trigger and output are materially distinct.

### Catalog targets

- reduce the current 73 implicitly invocable entries (94 total, including 21 explicit-only entries) to **no more than 50** in the first reorganization milestone;
- target **35 or fewer** implicit entries after overlap consolidation and knowledge extraction;
- mark manual workflows and presentation modes explicit-only;
- keep total implicit descriptions comfortably below the Codex fallback budget;
- ensure every implicit skill names an action and a verifiable output.

## Measurable Exit Criteria

The target operating model is reached when:

1. Every current entry has a reviewed registry classification and owner.
2. No `SKILL.md` is primarily a technology guide, architecture reference, domain model, or current-state report.
3. Every extracted fact has one canonical knowledge/docs source.
4. Every capability and review skill declares or selects its required knowledge sources.
5. Reasoning interventions run at defined lifecycle gates rather than only after an explicit user command.
6. Presentation modes cannot alter reasoning, verification, or safety behavior.
7. Workflow wrappers contain no second copy of authoritative steps.
8. Claude Code, Codex, and OpenCode route representative tasks to the same canonical sources.
9. `pnpm agents:validate`, classification validation, and link checks pass.
10. The pilot evaluation demonstrates improved routing precision and no loss of implementation quality.

## Migration Order

1. Establish this operating model and update root agent instructions.
2. Replace the current four-mode grouping with the corrected dispositions.
3. Create the machine-readable classification registry.
4. Extract the three pilot knowledge entries:
   - frontend technology stack;
   - architecture/design doctrine;
   - show-production lifecycle.
5. Build or refine the reasoning and review consumers that load those sources.
6. Extract broader pattern families and thin their implementation skills.
7. Consolidate overlapping review and authoring skills.
8. Re-measure catalog size, routing quality, and cross-client behavior.

Do not move all pattern files first and hope routing improves later. Each extraction must land with the consumer skill or workflow that will retrieve and apply the new canonical source.
