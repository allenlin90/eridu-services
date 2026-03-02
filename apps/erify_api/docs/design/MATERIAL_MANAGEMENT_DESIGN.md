# Material Management Design

> **Status**: ⏳ **To be written** — This design doc is a prerequisite before implementing Material Management in Phase 3.

## Scope

This document should cover:

1. **Data Models**: `Material`, `MaterialType`, `ShowMaterial` Prisma models
2. **Versioning Strategy**: Simple version label (no snapshot table) — clarify update semantics and whether historical versions are tracked
3. **Platform Targeting**: Is `platformId` on `Material` a nullable FK (null = all platforms), or a separate `MaterialPlatform` join table for multi-platform targeting?
4. **File Upload Integration**: How `resource_url` is populated via the presigned URL upload flow (see [File Upload Design](./FILE_UPLOAD_DESIGN.md))
5. **Client Scoping**: Materials are client-scoped per [BUSINESS.md](../BUSINESS.md) — clarify data isolation rules
6. **Service Architecture**: Following `service-pattern-nestjs` skill — payload types, repository pattern, controller endpoints
7. **API Contracts**: Zod schemas in `@eridu/api-types` for material CRUD

## Reference

- **[BUSINESS.md](../BUSINESS.md)** — Contains the ER diagram for `materials`, `material_types`, and `show_materials`
- **[File Upload Design](./FILE_UPLOAD_DESIGN.md)** — Presigned URL architecture that produces the URLs materials store
- **[Phase 3 Roadmap](../roadmap/PHASE_3.md)** — Implementation scope and success criteria
