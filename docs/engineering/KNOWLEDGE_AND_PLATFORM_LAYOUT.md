# Knowledge and Platform Layout

## Decision

The monorepo should separate three concerns that are currently mixed under `ai/`:

1. **Deployable platform services and deployment adapters** belong under `infra/`.
2. **Portable canonical knowledge** belongs under `knowledge/` and should be organized as Open Knowledge Format (OKF) bundles.
3. **Reusable agent capabilities and operating instructions** remain under `.agents/`.

`ai/` is therefore a transitional namespace, not the intended long-term owner of Open WebUI, LiteLLM, company knowledge, and MCP deployment material.

## Repository Layers

| Path | Responsibility | Examples |
| --- | --- | --- |
| `apps/` | First-party executable applications | NestJS APIs, React SPAs, auth service |
| `packages/` | Shared first-party code | API schemas, UI, SDKs, config packages |
| `infra/` | Third-party services, deployment overlays, and executable stack topology | Open WebUI, LiteLLM, Odoo, Docker Compose, Railway adapters |
| `knowledge/` | Canonical, platform-neutral knowledge bundles | policies, SOPs, domain concepts, reviewed references |
| `.agents/` | Agent instructions, skills, rules, and workflows | implementation procedures and tool-use guidance |
| `docs/` | Product and engineering documentation | architecture, shipped behavior, plans, roadmaps |
| `.railway/` | Railway-specific service descriptors | service build and start adapters |

The distinction is based on lifecycle rather than whether a directory contains application code:

- Open WebUI and LiteLLM are deployed services even when this repository only owns configuration, manifests, functions, and upgrade policy for them.
- A company policy is knowledge even when Open WebUI is currently its only runtime consumer.
- A skill explains how an agent performs work; it is not the company fact corpus.

## Target Layout

```text
infra/
├── README.md
├── odoo/
├── openwebui/
│   ├── README.md
│   ├── functions/
│   ├── assistant-adapters/
│   ├── access/
│   └── synced/                 # read-only live exports
├── litellm/
│   ├── README.md
│   ├── policy/
│   └── examples/
└── stacks/
    └── ai-workspace/
        ├── README.md
        ├── compose.yaml
        └── .env.example

knowledge/
├── index.md                    # OKF bundle navigation
├── log.md                      # optional bundle history
├── shared/
│   ├── index.md
│   └── <concept>.md
├── onboarding/
├── operations/
└── departments/

.agents/
├── skills/
├── workflows/
└── rules/
```

This is a target, not an instruction to move every existing file in one commit.

## Docker Compose Role

`infra/stacks/ai-workspace/compose.yaml` should be an executable representation of the deployed service topology:

```text
Open WebUI
├── PostgreSQL
├── Redis
└── LiteLLM
    ├── PostgreSQL
    ├── Redis
    └── model providers

Open WebUI
├── eridu_auth / Better Auth
└── erify_api MCP
```

The Compose stack should:

- pin the same Open WebUI and LiteLLM versions used on Railway;
- model separate PostgreSQL and Redis dependencies where production uses them;
- use `.env.example` placeholders and never contain production credentials;
- expose profiles for optional first-party services when running the entire stack locally is expensive;
- provide health checks and service names matching the logical Railway topology where practical;
- support local integration and disaster-recovery rehearsal.

Docker Compose is not the production deployment source of truth. Railway service configuration and live management APIs remain authoritative for deployed environment variables, persistent volumes, domains, credentials, and platform-specific settings. Compose records the portable topology and local boot contract.

## Open Knowledge Format Scope

OKF should organize the canonical knowledge corpus, not the entire monorepo.

An OKF bundle is a directory hierarchy of Markdown concept files with YAML frontmatter. It can live as a subdirectory of a larger Git repository. `index.md` and `log.md` have reserved navigation and history roles, while each other Markdown concept requires a non-empty `type` field.

This makes OKF appropriate for:

- company policies and SOPs;
- domain concepts and glossaries;
- architecture concepts intended for multiple tools;
- reviewed operational reference knowledge;
- generated concepts whose provenance and verification are recorded.

It is not a replacement for:

- Turborepo workspace organization;
- source code;
- package READMEs and API documentation;
- `.agents/skills/` invocation conventions;
- databases or current operational records;
- QMD, Graphify, Open WebUI retrieval, or MCP serving.

OKF defines the portable source format. Retrieval engines and serving systems consume the bundle.

## Mapping the Current Wiki Contract to OKF

The existing company-wiki metadata can become an OKF-compatible superset rather than being discarded.

| Current field | OKF treatment |
| --- | --- |
| `id` | Keep temporarily as an extension; prefer the bundle-relative path as the portable concept ID |
| `title` | Keep as `title` |
| `tags` | Keep as `tags` |
| missing concept kind | Add required `type`, such as `Policy`, `Playbook`, `Reference`, or `Domain Concept` |
| `status: active` | Map to `status: stable` |
| `status: draft` | Map to `status: draft` |
| `status: archived` | Map to `status: deprecated` |
| `review_by` | Map to or derive `stale_after` |
| `source_refs` | Migrate to structured `sources` entries |
| `owner` | Keep as an extension |
| `audiences` | Keep as an access-policy extension |
| `sensitivity` | Keep as an access-policy extension |
| `reviewed_at` | Keep as an extension unless a real verifier identity is available |

Do not fabricate `verified` actors from a review date. OKF verification records who or what performed the check, not merely that a date exists.

Current `[[wikilink]]` references should migrate toward standard Markdown links for strict portability. A compatibility parser may accept both during migration.

## Access Control

OKF metadata is not an authorization boundary.

- Separate bundles or publication artifacts around real access boundaries.
- Open WebUI collections and group grants continue enforcing Open WebUI access.
- A future MCP or HTTP retrieval surface must enforce caller identity and visibility itself.
- Restricted company knowledge must not be committed to this public repository. It requires either a private repository or a repository visibility change.

The Open WebUI sync layer should read canonical OKF bundles, derive collection artifacts and grants, and keep its generated/live exports under `infra/openwebui/`.

## Retrieval

The target retrieval flow is:

```text
knowledge/ OKF bundles ─┐
docs and app docs ──────┼──> QMD local index ──> coding agents
.agents capabilities ───┘

application source ─────────> Graphify local graph ──> coding agents

knowledge/ OKF bundles ─────> Open WebUI sync ──> Open WebUI knowledge collections
```

QMD does not require OKF, but OKF metadata improves filtering, provenance, lifecycle checks, and future interoperability. Graphify remains code-focused.

## Migration Plan

### Phase 1 — establish the contract

- Mark `ai/` as transitional.
- Document `infra/`, `knowledge/`, and `.agents/` ownership.
- Pilot QMD and Graphify without moving live platform files.
- Evaluate OKF against a small set of reviewed knowledge documents.

### Phase 2 — add executable stack topology

- Inventory the actual Railway Open WebUI, LiteLLM, PostgreSQL, Redis, auth, and MCP topology.
- Add `infra/stacks/ai-workspace/compose.yaml` with pinned versions and safe placeholders.
- Verify local service health and the Open WebUI-to-LiteLLM path.

### Phase 3 — migrate platform directories

- Move `ai/openwebui/` to `infra/openwebui/`.
- Move `ai/litellm/` to `infra/litellm/`.
- Re-home cross-platform architecture documents under `docs/engineering/` or the stack directory.
- Keep link-stability stubs only where active external references justify them.

Do this after active PRs that add files under `ai/openwebui/` have landed or been rebased, rather than creating a high-conflict rename now.

### Phase 4 — introduce the OKF bundle

- Create `knowledge/` or a private knowledge repository.
- Extend the existing validator with OKF `type`, status, links, provenance, and lifecycle checks.
- Migrate one shared/onboarding collection first.
- Update the Open WebUI sync source paths while preserving stable uploaded document IDs.
- Add retrieval evaluations before widening the corpus.

### Phase 5 — remove the transitional namespace

- Confirm no runtime, script, documentation, skill, or open PR references `ai/` as an authority.
- Remove compatibility stubs.
- Update QMD collection setup and repository routing documentation.

## Explicit Non-Decisions

This design does not yet:

- select an OKF-specific framework or editor;
- require every Markdown file to become an OKF concept;
- add a shared knowledge MCP service;
- commit QMD or Graphify indexes;
- make Docker Compose the Railway deployment controller;
- move restricted knowledge into the public monorepo.
