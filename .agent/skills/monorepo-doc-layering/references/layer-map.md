# Documentation Layer Map

## Root `docs/`

Use for monorepo-owned content.

- `docs/roadmap/`
  - phase status
  - active/deferred scope
  - backend/frontend/shared-package coordination
- `docs/prd/`
  - active in-flight requirements for the current phase
  - deleted or promoted when features ship
- `docs/features/`
  - shipped feature specs promoted from PRDs
  - product decisions, user context, links to technical docs
  - persistent — updated as features evolve
- `docs/workflows/`
  - cross-feature end-to-end flows (actor sequences, data flows, cross-domain dependencies)
  - persistent — updated as operational flows change
- `docs/domain/`
  - business domain language
  - entity model and product context
  - cross-app domain rules
- `docs/engineering/`
  - system architecture framing
  - engineering policies and governance
  - cross-app technical conventions
- `docs/adr/`
  - architecture decisions

## App Docs

### `apps/erify_api/docs/`

Use for:

- backend implementation behavior
- API semantics
- backend-focused operational runbooks
- backend planning archives when root roadmap has replaced app-local phase ownership

Do not use as the source of truth for:

- monorepo roadmap
- cross-app business context

### `apps/erify_studios/docs/`

Use for:

- frontend workflow behavior
- UX-specific operating notes
- frontend implementation references

Do not use as the source of truth for:

- monorepo roadmap
- broad product/domain ownership

## App Design Docs

### `apps/erify_api/docs/design/`

Use for backend-owned proposals or backend-heavy feature designs.

### `apps/erify_studios/docs/design/`

Use for frontend-owned proposals or UI/UX implementation plans.

## Package Docs

Use package `README.md` files for:

- installation
- exports
- contract usage
- integration notes specific to that package
