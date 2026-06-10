# Feature: Task-Input Fact Binding

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: Operational Actuals & Operations Review
> **Canonical docs**: [apps/erify_api/docs/TASK_INPUT_FACT_BINDING.md](../../apps/erify_api/docs/TASK_INPUT_FACT_BINDING.md)

## Problem

Generic task templates in Erify are highly customizable and modular, but the data captured in task sheets lives as generic, untyped JSON blobs in `task.content`. 
Because generic task inputs are not useful until they are associated with canonical facts:
1. Managers need reviewed task submissions to become trusted records for actual start/end times, host attendance, platform violations, and platform performance facts.
2. The database needs structured, indexed columns for these metrics so aggregation, real-time lateness calculation, performance dashboards, and platform violation tracking do not depend on arbitrary JSON field names.
3. Multiple conflicting inputs (e.g. automated scraper metrics, operator task sheets, and manager manual overrides) have no structured resolution hierarchy, leading to inconsistent actuals reporting.

## Users

| Role | Need |
| --- | --- |
| Studio Operator | Clear, simple task sheets with automatic, target-specific fields to record operational facts during a show. |
| Studio Manager | Efficient bulk-approval workflow to verify and confirm operational actuals, resolve anomalies, and review platform violations. |
| Studio Owner | Accurate, real-time reports of operational actuals, lateness metrics, and stream compliance. |

## What Was Delivered

- **Ingestion Pipeline**: Type-safe ingestion engine that parses confirmed task submissions and pushes values to indexed columns.
- **Dynamic Form Hydration**: Reconciles task snapshot schemas with active show assignments to dynamically generate deterministic inputs per creator and platform.
- **Source Priority Resolver**: Evaluates updates against a deterministic priority hierarchy (`MANAGER > PLATFORM > OPERATOR > PLANNED`) to resolve conflicting actuals records.
- **Polymorphic Auditing**: A unified `Audit` and `AuditTarget` database schema that preserves historical actuals changes with cascading target mappings (`onDelete: Cascade`).
- **Lateness & Attendance Derivation**: Live read-side derivation of creator attendance states (`ON_TIME`, `LATE`, `MISSING`) and `lateMinutes` from actual timestamps and scheduled show times.
- **Platform Performance Fact Bindings**: Platform-scoped GMV, view count, CTR, and CTO inputs write to `ShowPlatform` columns for the performance analytics surfaces.
- **Operations Review Panel**: Interactive dashboard surfaces (`/task-review` and `/show-run-review`) featuring tabbed data tables, date range filters, bulk approval queues, and client-side CSV exports.

## Key Product Decisions

- **Derived Lateness**: Attendance status and late minutes are derived dynamically at read time instead of written statically, ensuring absolute consistency with changing show schedule boundaries.
- **Audit Target Retention**: Cascade-deleting `AuditTarget` join rows on entity deletion while keeping the parent `Audit` envelope preserves clean historical audit trails.
- **Priority-Gated Actuals**: Updates with lower priority than the current actuals source are safely skipped but retained in the task submission content for audit verification.

## Acceptance Record

- [x] Ingestion pipeline translates confirmed task content to indexed columns.
- [x] Template fields support `system_fact_key` bindings with validation constraints.
- [x] Task templates dynamically hydrate form inputs per assigned target.
- [x] Source priority resolver enforces priority rules and logs skips.
- [x] Auditing captures all updates/overrides with polymorphic target retention.
- [x] Operations Review panel filters, displays exception queues, and exports to CSV.
