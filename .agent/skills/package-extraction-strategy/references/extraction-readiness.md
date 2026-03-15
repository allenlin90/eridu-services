# Extraction Readiness — Concrete Examples

## Backend Example: Task Submission Reporting

```
src/models/task-report/
  ├── task-report.module.ts                 # NestJS wiring
  ├── task-report.controller.ts             # HTTP transport
  ├── task-report-definition.service.ts     # Definition CRUD (NestJS-coupled)
  ├── task-report-definition.repository.ts  # Definition persistence (Prisma-coupled)
  ├── task-report-result.service.ts         # Result CRUD (NestJS-coupled)
  ├── task-report-result.repository.ts      # Result persistence (Prisma-coupled)
  ├── task-report-query.service.ts          # Orchestration (NestJS-coupled)
  ├── schemas/                              # Zod + payload types
  └── lib/                                  # PORTABLE
      ├── extract-row-values.ts             # snapshot schema + content → flat row
      ├── normalize-field-type.ts           # field type normalization rules
      ├── partition-key.ts                  # template_uid + snapshot_version grouping
      └── compute-summaries.ts              # numeric aggregation (count/sum/avg)
```

If a second consumer (e.g. a dedicated reporting microservice) needs these functions, the `lib/` directory moves to `@eridu/report-core` with zero rewrite.

## Frontend Example: Task Submission Reporting

```
src/features/task-reports/
  ├── api/                                  # TanStack Query hooks (React-coupled)
  ├── components/                           # UI components (React-coupled)
  ├── hooks/                                # React hooks (React-coupled)
  └── lib/                                  # PORTABLE
      ├── merge-partitions-to-shows.ts      # partition → show-centric merge
      ├── compute-summaries.ts              # client-side numeric re-computation
      ├── serialize-csv.ts                  # CSV export serializer
      └── serialize-xlsx.ts                 # XLSX export serializer
```

If `erify_creators` needs the same CSV/XLSX serialization, extract `lib/` to `@eridu/report-engine`.

## Portable vs Framework-Coupled Decision

| Function | Input | Output | Framework Deps | Location |
|---|---|---|---|---|
| `extractRowValues(schema, content)` | plain objects | flat row object | None | `lib/` |
| `computeSummaries(partitions)` | array of objects | summary object | None | `lib/` |
| `serializeCsv(rows, columns)` | arrays | string | None | `lib/` |
| `TaskReportQueryService.generateResult()` | payload type | void (stores result) | NestJS, Prisma | `service` |
| `useRunReportMutation()` | — | mutation hook | React, TanStack | `hooks/` |
