# PRD: Studio Reference Data Management

> **Status**: Active
> **Phase**: 5 — Candidate (Studio Autonomy track)
> **Workstream**: Studio self-service — reference data governance
> **Depends on**: None (no prerequisite features required)
> **Blocks**: None (studios operate on system-defined reference data today)

## Problem

Studios consume five categories of reference data — clients, platforms, show types, show standards, and show statuses — but cannot create or manage any of them. All reference data CRUD lives exclusively in `/admin/*` endpoints.

Current state:

- `/admin/clients`, `/admin/platforms`, `/admin/show-types`, `/admin/show-standards`, `/admin/show-statuses` provide full CRUD — system-admin only.
- Studios have read-only access via lookup endpoints (`/studios/:studioId/clients`, `/studios/:studioId/platforms`, etc.).
- Reference data is global (shared across all studios).

Consequences today:

- A new client engagement requires a system admin to create the client record before the studio can reference it in shows.
- A new streaming platform (e.g., a regional platform) requires system admin intervention.
- Studios with novel show types or business standards must wait for system admin to add them.
- Show status workflows are rigid — studios cannot define custom status progressions.

### Scope Decision: Studio-Scoped vs Global

Reference data presents a design tension:

- **Global reference data** (current model): one set of clients/platforms/types shared across all studios. Simple, consistent, but inflexible.
- **Studio-scoped reference data**: each studio manages its own set. Flexible, but creates data fragmentation and duplication.
- **Hybrid**: studios can create studio-local records; system admins maintain a global catalog. Most flexible, most complex.

**Recommendation**: Start with **studio-initiated creation into the global catalog** (similar to how studio creator onboarding creates global creators). Studios can create new reference records that become globally available. This avoids data fragmentation while removing the system-admin bottleneck.

## Users

- **Studio ADMIN** (primary): create new clients, platforms, and metadata standards; update records they created
- **Studio MANAGER** (secondary): read-only access to reference data (same as today)
- **System Admin**: retains full CRUD; can update or deactivate any reference record regardless of origin

## Existing Infrastructure

| Surface / Model         | Current Behavior                  | Status   |
| ----------------------- | --------------------------------- | -------- |
| `/admin/clients`        | Full CRUD, system-admin only      | ✅ Exists |
| `/admin/platforms`      | Full CRUD, system-admin only      | ✅ Exists |
| `/admin/show-types`     | Full CRUD, system-admin only      | ✅ Exists |
| `/admin/show-standards` | Full CRUD, system-admin only      | ✅ Exists |
| `/admin/show-statuses`  | Full CRUD, system-admin only      | ✅ Exists |
| Studio lookup endpoints | Read-only for all five categories | ✅ Exists |

## Requirements

### In Scope

1. **Client creation from studio context**
   - Studio admins can create new client records from the studio workspace.
   - Client records are global (available to all studios after creation).
   - Required fields: `name`
   - Optional fields: `metadata`

2. **Platform creation from studio context**
   - Studio admins can create new platform records.
   - Same global-catalog pattern as clients.

3. **Show type / standard / status creation from studio context**
   - Studio admins can create new metadata standard records.
   - Records become globally available.
   - Studios cannot delete or deactivate global reference data (system admin governance).

4. **Studio-initiated update**
   - Studio admins can update records they or their studio created (tracked via `createdByStudioId` or similar).
   - System admins can update any record regardless of origin.

5. **No studio-scoped deletion**
   - Reference data deletion remains a system-admin-only governance action.
   - Studios can request deactivation but cannot execute it.

### Out of Scope

- Studio-scoped (private) reference data
- Reference data approval workflows
- Custom status progression engines
- Reference data merge/deduplication tools
- Bulk import of reference data

## API Shape

### New Studio Endpoints

```http
POST   /studios/:studioId/clients
PATCH  /studios/:studioId/clients/:clientId

POST   /studios/:studioId/platforms
PATCH  /studios/:studioId/platforms/:platformId

POST   /studios/:studioId/show-types
PATCH  /studios/:studioId/show-types/:showTypeId

POST   /studios/:studioId/show-standards
PATCH  /studios/:studioId/show-standards/:showStandardId

POST   /studios/:studioId/show-statuses
PATCH  /studios/:studioId/show-statuses/:showStatusId
```

All POST/PATCH operations require `STUDIO_ROLE.ADMIN`.
Existing GET (lookup) endpoints remain unchanged for all roles.

### Error Codes

| Code                   | HTTP Status | Condition                                                                             |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `DUPLICATE_NAME`       | 409         | Record with same name already exists in global catalog                                |
| `REFERENCE_NOT_FOUND`  | 404         | Record does not exist                                                                 |
| `UPDATE_NOT_PERMITTED` | 403         | Studio attempting to update a record created by a different studio or by system admin |

## Acceptance Criteria

- [ ] Studio ADMIN can create clients, platforms, show types, standards, and statuses from the studio workspace.
- [ ] Newly created records are globally available to all studios.
- [ ] Studio ADMIN can update records originated by their studio.
- [ ] Studio ADMIN cannot delete reference data (system-admin only).
- [ ] Duplicate name detection prevents identical records.
- [ ] MANAGER and MEMBER roles cannot create or update reference data (403).
- [ ] Existing lookup endpoints remain unchanged.
- [ ] `/admin/*` routes retain full CRUD governance.

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/`
- Related admin controllers: `apps/erify_api/src/admin/clients/`, `apps/erify_api/src/admin/platforms/`, etc.
