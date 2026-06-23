# Entity Relationships

Detailed field-level reference for every entity in the show graph. Read this when you need to know exact column names, types, constraints, and cardinalities.

## Show

**Table**: `shows`
**Schema**: `apps/erify_api/prisma/schema.prisma` L113–174

| Field | DB column | Type | Required | Notes |
|---|---|---|---|---|
| id | id | BigInt (PK) | Yes | Auto-increment, never exposed externally |
| uid | uid | String (unique) | Yes | External ID prefix `show_` |
| externalId | external_id | String? | No | External system ID, unique per client (`@@unique([clientId, externalId])`) |
| name | name | String | Yes | Show title |
| startTime | start_time | DateTime | Yes | Planned start |
| endTime | end_time | DateTime | Yes | Planned end |
| actualStartTime | actual_start_time | DateTime? | No | Written by fact extraction or manager override |
| actualEndTime | actual_end_time | DateTime? | No | Written by fact extraction or manager override |
| metadata | metadata | Json | Yes | Default `{}`. Contains `actuals_source` map |
| clientId | client_id | BigInt (FK) | Yes | → Client (cascade delete) |
| studioId | studio_id | BigInt? (FK) | No | → Studio (set null) |
| studioRoomId | studio_room_id | BigInt? (FK) | No | → StudioRoom (set null) |
| showTypeId | show_type_id | BigInt (FK) | Yes | → ShowType (bau, campaign, other) |
| showStatusId | show_status_id | BigInt (FK) | Yes | → ShowStatus (lookup table) |
| showStandardId | show_standard_id | BigInt (FK) | Yes | → ShowStandard (standard, premium) |
| scheduleId | schedule_id | BigInt? (FK) | No | → Schedule (cascade delete) |

**Key indexes**: `[startTime, endTime]`, `[studioRoomId, startTime, endTime, deletedAt]` (room conflict), `[clientId, startTime, endTime, deletedAt]` (creator double-booking).

**Reverse relations**: ShowCreator[], ShowPlatform[], TaskTarget[], CompensationLineItemTarget[], AuditTarget[].

---

## ShowCreator

**Table**: `show_creators`
**Schema**: L177–213

Junction between Show and Creator with per-show compensation overrides and attendance tracking.

| Field | DB column | Type | Notes |
|---|---|---|---|
| id / uid | — | BigInt / String | PK + external ID |
| note | note | String? | Assignment note |
| agreedRate | agreed_rate | Decimal(10,2)? | Per-show fixed amount override |
| compensationType | compensation_type | String? | FIXED, COMMISSION, or HYBRID |
| commissionRate | commission_rate | Decimal(10,2)? | Per-show commission percent (0–100) |
| actualStartTime | actual_start_time | DateTime? | Creator's actual start (from fact extraction) |
| actualEndTime | actual_end_time | DateTime? | Creator's actual end (from fact extraction) |
| attendanceMissing | attendance_missing | Boolean | Default false. Set by `creator_attendance_missing` fact |
| attendanceReason | attendance_reason | String? | Required when derived attendance is LATE or attendanceMissing is true |
| metadata | metadata | Json | Default `{}` |
| showId | show_id | BigInt (FK) | → Show (cascade) |
| creatorId | mc_id | BigInt (FK) | → Creator (cascade). Note: DB column is `mc_id` (legacy naming) |

**Constraint**: `@@unique([showId, creatorId])` — one assignment per creator per show.

**Reverse relations**: CompensationLineItemTarget[], AuditTarget[].

---

## ShowPlatform

**Table**: `show_platforms`
**Schema**: L216–247

Junction between Show and Platform with stream metadata and performance metrics.

| Field | DB column | Type | Notes |
|---|---|---|---|
| id / uid | — | BigInt / String | PK + external ID |
| liveStreamLink | live_stream_link | String? | External stream URL |
| platformShowId | platform_show_id | String? | External platform ID (e.g. TikTok show ID) |
| actualStartTime | actual_start_time | DateTime? | Platform stream actual start |
| actualEndTime | actual_end_time | DateTime? | Platform stream actual end |
| viewerCount | viewer_count | Int | Default 0. From `show_platform_view_count` fact |
| gmv | gmv | Decimal(12,2)? | From `show_platform_gmv` fact |
| ctr | ctr | Decimal(5,2)? | From `show_platform_ctr` fact |
| cto | cto | Decimal(5,2)? | From `show_platform_cto` fact |
| metadata | metadata | Json | Default `{}` |
| showId | show_id | BigInt (FK) | → Show (cascade) |
| platformId | platform_id | BigInt (FK) | → Platform (cascade) |

**Constraint**: `@@unique([showId, platformId])` — one entry per platform per show.

**Reverse relations**: ShowPlatformViolation[], AuditTarget[].

---

## ShowPlatformViolation

**Table**: `show_platform_violations`
**Schema**: L762–783

Append-only violation log for platform-level infractions during a show.

| Field | Type | Notes |
|---|---|---|
| id / uid | BigInt / String | PK + external ID |
| violationType | String | Type of violation |
| severity | String | Default `WARNING` |
| reason | String? | Description |
| observedAt | DateTime | When observed |
| supersededAt | DateTime? | Soft-history: newer violation supersedes older one |
| sourceTaskId | BigInt? (FK) | Task that reported this violation |
| sourceFieldId | String? | Field within the task submission |
| showPlatformId | BigInt (FK) | → ShowPlatform (cascade) |

**Rule**: Never update or delete violation rows. Use `supersededAt` for soft-history.

---

## ShowStatus (Lookup Table)

**Table**: `show_status`
**Schema**: L338–352

| Field | Type | Notes |
|---|---|---|
| id / uid | BigInt / String | PK + external ID |
| systemKey | String? (unique) | Programmatic key for code references |
| name | String (unique) | Human-readable: draft, confirmed, live, completed, cancelled, cancelled_pending_resolution |

**Seeded values**: draft, confirmed, live, completed, cancelled, cancelled_pending_resolution.

---

## ShowType / ShowStandard (Lookup Tables)

- **ShowType** (L323–336): `bau`, `campaign`, `other`.
- **ShowStandard** (L354–367): `standard`, `premium`.

Both follow the same structure as ShowStatus (id, uid, name, metadata, soft-delete).

---

## Task → Show Connection

Tasks connect to shows via the **TaskTarget** polymorphic junction:

```
Task ← TaskTarget (targetType="SHOW", showId=Show.id)
```

**TaskTarget** (L733–755):
- `targetType`: String (e.g. "SHOW", "STUDIO")
- `showId`: BigInt? (FK) — nullable, populated when targetType is SHOW
- `studioId`: BigInt? (FK) — nullable, populated when targetType is STUDIO

Tasks are NOT directly linked to shows via a single FK. Always query through TaskTarget.

**Task types** (by TaskType enum): SETUP, ACTIVE, CLOSURE, ADMIN, ROUTINE, OTHER.
**Task statuses** (by TaskStatus enum): PENDING, IN_PROGRESS, REVIEW, COMPLETED, BLOCKED, CLOSED.

---

## Schedule → Show Connection

Shows can optionally reference a Schedule via `scheduleId` (FK). Schedule publish creates/updates/cancels shows while preserving show identity through `externalId`.

**Schedule** (L521–568):
- Status progression: draft → review → published
- `planDocument` JSON stores Google Sheets planning data
- Relations: Client, Studio, created/published by User

The schedule-show relationship is one-to-many (one schedule can produce many shows). A show can be orphaned (no schedule) or manually reassigned between same-studio, same-client schedules.

---

## StudioRoom → Show Connection

Shows reference rooms via `studioRoomId` (optional FK on Show). Room conflict detection uses the composite index `[studioRoomId, startTime, endTime, deletedAt]`.

---

## StudioShift → Show Connection

Shifts are NOT directly linked to shows via FK. The relationship is temporal: shifts and shows overlap in time within the same studio. Shift coverage (duty managers, operators) is relevant to show readiness but queried by time-overlap, not by join.

---

## Compensation → Show Connection

`CompensationLineItemTarget` is a polymorphic junction that connects compensation line items to shows and show-creators:
- `showId`: BigInt? (FK) — when the line item targets a show
- Show-level and creator-level compensation are computed downstream from ShowCreator terms and approved facts.

---

## Audit → Show Connection

`AuditTarget` is a polymorphic junction for audit history:
- `showId`: BigInt? (FK) — when auditing a show
- Actions: CREATE, UPDATE, DELETE, OVERRIDE, SKIPPED_LOWER_PRIORITY
- Every fact-extraction write/skip creates an Audit record
