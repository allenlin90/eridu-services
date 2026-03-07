# Phase 1: Core Foundation

> **TLDR**: Closed. Phase 1 established the platform foundation: core domain entities, show management, schedule planning with snapshot versioning, JWT authentication via `@eridu/auth-sdk`, and the initial controller scopes for admin, studio, and authenticated-user access.

**Status**: Closed

## Goal

Establish the first production-ready backend and domain foundation for live-commerce operations so later workflow features can build on stable entities, authentication, and scheduling.

## Delivered

- Core operational entities: users, clients, MCs, platforms, studios, rooms, memberships, shows
- Initial show lifecycle support with MC and platform relationships
- Schedule planning with JSON plan documents, snapshot history, validation, and publish flow
- JWT validation via `@eridu/auth-sdk`
- Initial authorization model using `isSystemAdmin` and `StudioMembership`
- Public, admin, authenticated-user, and backdoor controller scopes
- Zod-based validation and serializer patterns
- Prisma/PostgreSQL repository-backed API foundation

## Implementation Notes

- The canonical shipped behavior is documented in:
  - [apps/erify_api/docs/SCHEDULE_PLANNING.md](/Users/allenlin/Desktop/projects/eridu-services/apps/erify_api/docs/SCHEDULE_PLANNING.md)
  - [docs/product/ARCHITECTURE_OVERVIEW.md](/Users/allenlin/Desktop/projects/eridu-services/docs/product/ARCHITECTURE_OVERVIEW.md)
  - [docs/product/BUSINESS.md](/Users/allenlin/Desktop/projects/eridu-services/docs/product/BUSINESS.md)
- The phase was backend-heavy in implementation, but it established cross-app product foundations rather than a backend-only roadmap.

## Deferred From Phase 1

- More complex role hierarchy and broader membership models
- Advanced workflow tooling on top of shows and schedules
- Review, moderation, and ticketing flows introduced in later phases

## Exit Criteria

- Stable entity model for core operations: met
- Schedule planning usable in production workflows: met
- Authentication and baseline authorization in place: met
- Platform ready for workflow expansion in later phases: met
