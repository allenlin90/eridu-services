# Material Management Design

> **Status**: 🗓️ **Planned** — Material Management is deferred to Phase 4 and is not implemented in the current schema.

## Scope

This document should cover:

1. **Data Models**: `Material`, `MaterialType`, `ShowMaterial` Prisma models
2. **Versioning Strategy**: Simple version label (no snapshot table) — clarify update semantics and whether historical versions are tracked
3. **Platform Targeting**: Is `platformId` on `Material` a nullable FK (null = all platforms), or a separate `MaterialPlatform` join table for multi-platform targeting?
4. **File Upload Integration**: How `resource_url` is populated via the presigned URL upload flow (see [File Upload](../FILE_UPLOAD.md))
5. **Client Scoping**: Materials are client-scoped per [Business Domain](../../../../docs/domain/BUSINESS.md) — clarify data isolation rules
6. **Service Architecture**: Following `service-pattern-nestjs` skill — payload types, repository pattern, controller endpoints
7. **API Contracts**: Zod schemas in `@eridu/api-types` for material CRUD

## Reference

- **[Business Domain](../../../../docs/domain/BUSINESS.md)** — Contains the ER diagram for `materials`, `material_types`, and `show_materials`
- **[File Upload](../FILE_UPLOAD.md)** — Implemented presigned URL architecture that materials should build on
- **[Phase 4 Roadmap](../../../../docs/roadmap/PHASE_4.md)** — Current phase assignment for material-management planning
