# Ideation: JSON Schema for Document-Based Records

> **Status**: Deferred from schema/document validation investigation
> **Origin**: task template + task report definition schema audit (2026-03-19)
> **Related**: [task template schema](../../packages/api-types/src/task-management/task-template.schema.ts), [template definition schema](../../packages/api-types/src/task-management/template-definition.schema.ts), [task report schema](../../packages/api-types/src/task-management/task-report.schema.ts)

## What

Apply a formal JSON Schema workflow to document-based records stored in JSON columns, starting with:

1. `TaskTemplate.currentSchema`
2. `TaskReportDefinition.definition`

The intended direction is:

- keep **Zod as the canonical authoring source**
- generate **machine-readable JSON Schema artifacts** from those canonical schemas
- use the generated artifacts for tooling, documentation, and non-HTTP validation paths

This is not a proposal to maintain Zod and JSON Schema separately.

## Why It Was Considered

- Task templates already have strong runtime validation through `TemplateSchemaValidator`, but the shared API create/update contract still accepts `schema: z.record(z.string(), z.any())`.
- The backend service payloads for task templates still use `currentSchema: any`, which weakens type guarantees after controller validation.
- Task report definitions are persisted as JSON and typed in API contracts, but service serialization currently trusts DB JSON with a type cast instead of re-validating document shape on read.
- A machine-readable schema would help for:
  - import/export tooling
  - backfills and migrations touching JSON columns
  - background jobs and scripts outside Nest request handling
  - future editor/form tooling
  - documenting document payloads more explicitly than broad `Json` storage

## Why It Was Deferred

1. **The repo already has a canonical schema system.** Duplicating validation logic in hand-written JSON Schema would create drift immediately.
2. **The current app behavior is mostly protected by Zod at the API boundary.** The highest-value gap is consistency and tooling, not an active production failure.
3. **The generation path needs one standard.** The team should decide whether to use Zod 4 JSON Schema export directly or add a focused generator dependency, rather than mixing approaches.
4. **DB-level enforcement is a separate decision.** Generating JSON Schema for tooling is low-risk; pushing schema checks into Postgres or Prisma workflows is a later step.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A script, importer, backfill, or worker needs to validate task-template or task-report-definition documents outside the Nest controller layer.
2. More document-style JSON records are introduced and ad hoc `z.any()` contracts start to spread.
3. The team wants schema-versioned document migrations for task templates or saved report definitions.
4. API/docs consumers need a machine-readable schema artifact for these records beyond OpenAPI response examples.

## Implementation Notes (Preserved Context)

### Keep one source of truth

- Canonical source should remain in `packages/api-types/src/task-management/`.
- Prefer dedicated exported document schemas such as:
  - `taskTemplateDocumentSchema`
  - `taskReportDefinitionDocumentSchema`
- JSON Schema should be generated from those, not authored by hand.

### Immediate type-safety wins before full JSON Schema rollout

1. Replace broad task-template input contracts:
   - `createTaskTemplateSchema.schema`
   - `updateTaskTemplateSchema.schema`
   - service payload `currentSchema: any`
2. Replace `TaskReportDefinitionService` read-path cast with parse-or-log behavior for persisted JSON.
3. Add document-focused tests that validate both write-time and read-time handling.

### Suggested document boundaries

1. **Task template document**
   - base document: `TemplateSchemaValidator`
   - preserve task-type metadata requirement
   - consider explicit `schema_version` once migrations across template shapes become likely

2. **Task report definition document**
   - extract `definition` into its own named schema instead of anonymous nested object reuse
   - candidate shape:
     - `scope`
     - `columns`
     - optional future metadata like preset/version/source

### Where generated JSON Schema would be useful

- CLI and one-off scripts touching JSON payloads
- admin/debug tooling
- contract snapshots in tests
- future FE builder metadata editors
- potential validation of legacy rows during audits or backfills

### Non-goals for the first promotion

- Do not hand-maintain parallel JSON Schema files.
- Do not introduce database `CHECK` constraints in the first pass.
- Do not rewrite existing JSON rows just to add schema machinery unless versioning requires it.

### Verification items (when promoted)

- Snapshot generated JSON Schema artifacts for task template and task report definition documents.
- Assert invalid documents fail both:
  - API boundary validation
  - offline/tooling validation using generated schema
- Add read-path validation coverage for persisted `TaskReportDefinition.definition`.
- Confirm FE task-template builder and task-report builder still use the same canonical types after contract tightening.
