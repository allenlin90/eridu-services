# TASK_INPUT_FACT_BINDING_DESIGN.md

## Technical Design: Task-Input Fact Binding and Event-Driven Actuals

This document defines the architectural specifications, database schemas, and extraction pipeline rules for **PR 12 (Critical task-input semantics for actuals and performance)**. It bridges the gap between generic, operator-completed task submissions and first-class indexed operational metrics across shows, platforms, creators, and platform violations.

---

## 1. Architectural Core Principles

To deliver rapid reporting, highly customizable operator form layouts, deterministic priority conflict resolution, and solid referential integrity, the architecture is grounded in five core principles:

1. **Event-Driven Push Model (Deterministic Actuals)**: Facts are parsed and written immediately upon trigger events (e.g., task submission completed, manager override, or system telemetry updates). Writes are gated by a strict source priority hierarchy: manager overrides outrank telemetry, telemetry outranks operator task forms, and task forms outrank planning schedules. Lower-priority updates do not overwrite newer, higher-priority data.
2. **Context-Aware Task Generation (Dynamic Target Hydration)**: Task templates remain generic and platform/creator-agnostic. When a task is instantiated for a specific show, a `TaskTarget` links them. The task generation engine scans the template for `system_fact_key` markers (e.g., `creator_attendance_status`) and dynamically hydrates the frozen task snapshot schema with actual target-specific field inputs (e.g., `fld_attendance_creator_abc123`).
3. **Core Indices + JSONB Bucket (Optimized & Extensible)**: Performance metrics that drive high-frequency filtering, sorting, or billing (actual times, attendance, late minutes, platform violations, GMV) are stored in dedicated, indexed columns. All other current and future metrics (CTR, CTO, likes, concurrents) live inside a flexible `performance_metrics` JSONB bucket.
   - **Promotion Workflow**: When a metric in the JSONB bucket becomes a high-priority filter or search target, developers execute a database migration cutover to promote it to a first-class indexed column, backfilling it from the JSONB history.
4. **Prisma-Compliant Polymorphic Auditing (`Audit` & `AuditTarget`)**: Standardize manual manager overrides and automated changes under a centralized audit system. The schemas avoid raw string target pointers, instead defining explicit, optional foreign key fields (`showId`, `showCreatorId`, `showPlatformId`, `studioShiftId`) to preserve strict relational constraints.
5. **Lean Core Models (No Status/Source Bloat)**: Core models do not carry `actualsStatus` or `actualsSource` columns. Instead, the current source provenance (e.g., `'MANAGER'`, `'TASK'`) is stored inside the model's existing `metadata` JSONB bucket (`metadata.actuals_source`). The actuals state (missing vs. complete) is dynamically inferred at query time (`actualStartTime IS NULL`).

---

## 2. Database Schema

The database schema is updated to add nullable actuals columns to operational tables, index high-frequency query parameters, and establish the standardized polymorphic auditing system.

### A. Core Operational Models

```prisma
model Show {
  // ... existing fields ...
  actualStartTime    DateTime?                  @map("actual_start_time")
  actualEndTime      DateTime?                  @map("actual_end_time")
  performanceMetrics Json                       @default("{}") @map("performance_metrics") // Extensible JSONB bucket (likes, shares, CTR, etc.)

  @@index([actualStartTime, actualEndTime])
}

model ShowCreator {
  // ... existing fields ...
  actualStartTime    DateTime?                  @map("actual_start_time")
  actualEndTime      DateTime?                  @map("actual_end_time")
  attendanceStatus   String?                    @map("attendance_status") // "ON_TIME" | "LATE" | "MISSING" (null = fallback to planned)
  lateMinutes        Int                        @default(0) @map("late_minutes") // Indexed for easy penalty/compensation queries
  attendanceReason   String?                    @map("attendance_reason")
  performanceMetrics Json                       @default("{}") @map("performance_metrics") // Extensible metrics (CTR, conversion specific to MC)

  @@index([attendanceStatus])
  @@index([lateMinutes])
  @@index([actualStartTime, actualEndTime])
}

model ShowPlatform {
  // ... existing fields ...
  actualStartTime    DateTime?                  @map("actual_start_time")
  actualEndTime      DateTime?                  @map("actual_end_time")
  gmv                Decimal                    @default(0.00) @map("gmv") @db.Decimal(12, 2) // Transport as string on wire (Finance Guardrail #2)
  performanceMetrics Json                       @default("{}") @map("performance_metrics") // Extensible platform data (CTO, PCU, Followers)

  @@index([gmv])
  @@index([actualStartTime, actualEndTime])
}

model ShowPlatformViolation {
  id             BigInt                         @id @default(autoincrement())
  uid            String                         @unique
  showPlatformId BigInt                         @map("show_platform_id")
  showPlatform   ShowPlatform                   @relation(fields: [showPlatformId], references: [id], onDelete: Cascade)
  violationType  String                         @map("violation_type") // e.g., "PRICING", "COMMUNITY", "COPYRIGHT"
  severity       String                         @default("WARNING") @map("severity") // "WARNING" | "CRITICAL"
  reason         String                         @map("reason") // Operator-entered explanation of the violation
  observedAt     DateTime                       @map("observed_at")
  metadata       Json                           @default("{}") @map("metadata")
  createdAt      DateTime                       @default(now()) @map("created_at")

  @@index([showPlatformId])
  @@index([violationType])
  @@index([observedAt])
  @@map("show_platform_violations")
}
```

### B. Centralized Polymorphic Auditing Models

```prisma
model Audit {
  id        BigInt                              @id @default(autoincrement())
  uid       String                              @unique
  action    String                              @map("action") // "CREATE" | "UPDATE" | "DELETE" | "OVERRIDE"
  actorId   BigInt?                             @map("actor_id")
  actor     User?                               @relation(fields: [actorId], references: [id], onDelete: SetNull)
  ipAddress String?                             @map("ip_address")
  userAgent String?                             @map("user_agent")
  metadata  Json                                @default("{}") // Stores snapshots of old/new values, change reasons
  targets   AuditTarget[]
  createdAt DateTime                            @default(now()) @map("created_at")

  @@index([uid])
  @@index([action])
  @@index([actorId])
  @@index([createdAt])
  @@map("audits")
}

model AuditTarget {
  id            BigInt                          @id @default(autoincrement())
  auditId       BigInt                          @map("audit_id")
  audit         Audit                           @relation(fields: [auditId], references: [id], onDelete: Cascade)
  // Polymorphic reference identifiers
  targetType    String                          @map("target_type") // "SHOW" | "SHOW_CREATOR" | "SHOW_PLATFORM" | "STUDIO_SHIFT"
  targetId      BigInt                          @map("target_id")
  // Prisma referential integrity fields
  showId        BigInt?                         @map("show_id")
  show          Show?                           @relation(fields: [showId], references: [id], onDelete: Cascade)
  showCreatorId BigInt?                         @map("show_creator_id")
  showCreator   ShowCreator?                    @relation(fields: [showCreatorId], references: [id], onDelete: Cascade)
  showPlatformId BigInt?                        @map("show_platform_id")
  showPlatform  ShowPlatform?                   @relation(fields: [showPlatformId], references: [id], onDelete: Cascade)
  studioShiftId BigInt?                         @map("studio_shift_id")
  studioShift   StudioShift?                    @relation(fields: [studioShiftId], references: [id], onDelete: Cascade)

  @@unique([auditId, targetType, targetId])
  @@index([targetType, targetId])
  @@index([showId])
  @@index([showCreatorId])
  @@index([showPlatformId])
  @@index([studioShiftId])
  @@map("audit_targets")
}
```

---

## 3. Workflow Mechanics

### A. Context-Aware Task Generation (Dynamic Target Hydration)

Generic task templates do not reference static creators or platforms. The linkage is resolved dynamically upon task instantiation:

1. **Linkage Trigger**: When a task is generated for a show (either via scheduler or manual batch generation), a `TaskTarget` entry of `targetType: "SHOW"` is created, linking the `Task` to the `Show` record.
2. **Snapshot Hydration**: The generation engine scans the template's schema definitions for `system_fact_key` bindings:
   - If a field is bound to `creator_attendance_status`, the engine queries the show's assigned `ShowCreator` relationships. For each assigned creator, it dynamically generates unique inputs in the task's frozen `snapshot.schema`.
     - *Generated unique input keys*: `fld_attendance_creator_abc123` (Alice) and `fld_attendance_creator_xyz789` (Bob).
   - Platform-scoped fields like `platform_gmv` undergo the same dynamic expansion, creating input parameters for each of the show's active platforms (e.g., `fld_gmv_platform_tik123`).
3. **Form Rendering**: The operator is presented with a dynamically built task form containing labeled, explicit input fields for each active creator and platform assigned to the show.

### B. Event-Driven Push Extraction Pipeline

When an operator submits a completed task form or a system integration provides telemetry data:

1. **Extraction**: The extraction engine parses the submission's `task.content`. It pulls the entered value, target UID, and any matching companion values (such as `attendanceReason` or violation descriptions).
2. **Priority Resolution Check**:
   - Compare the incoming source priority against the current record's `metadata.actuals_source` value.
   - If no actuals exist, the record operates at `Priority 0` (planned schedule).
   - A strict hierarchy is applied:
     $$\text{MANAGER Override (Priority 3)} > \text{SYSTEM Telemetry (Priority 2)} > \text{TASK Submission (Priority 1)} > \text{SCHEDULE Planned (Priority 0)}$$
3. **Update Decision**:
   - **Higher or Equal Priority**: The incoming value is written directly to the target column (e.g., `ShowPlatform.gmv = 1500.50`), and `metadata.actuals_source` is set to the new source (e.g., `'TASK'`). Centralized polymorphic audit logs are written to the database.
   - **Lower Priority**: The active column remains unchanged. The lower-priority input is preserved within `task.content` for operational review and audit historical reference.

---

## 4. Querying & Performance Rollups

By maintaining indexed actuals columns, the database can be queried directly to support operational rollups, dashboard widgets, and financial reports:

### A. Find Shows with Platform Violations

```sql
SELECT s.uid, s.name, pv.violation_type, pv.severity, pv.reason, pv.observed_at
FROM shows s
JOIN show_platforms sp ON sp.show_id = s.id
JOIN show_platform_violations pv ON pv.show_platform_id = sp.id
WHERE s.start_time BETWEEN :start_date AND :end_date;
```

### B. Calculate Creator Penalties & Attendance Issues (Late Minutes)

```sql
SELECT c.name, sc.attendance_status, sc.late_minutes, sc.attendance_reason, s.uid AS show_uid
FROM show_creators sc
JOIN creators c ON sc.mc_id = c.id
JOIN shows s ON sc.show_id = s.id
WHERE sc.attendance_status = 'LATE'
  AND s.start_time BETWEEN :start_date AND :end_date;
```

### C. Identify Shows with Missing Actuals (Inferred Status Queries)

```sql
SELECT uid, name, start_time, end_time
FROM shows
WHERE (actual_start_time IS NULL OR actual_end_time IS NULL)
  AND start_time BETWEEN :start_date AND :end_date;
```
