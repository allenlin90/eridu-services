# Extraction Readiness — Concrete Examples

## Backend Example: A Reporting Module

```
src/models/{feature}/
  ├── {feature}.module.ts                 # NestJS wiring
  ├── {feature}.controller.ts             # HTTP transport
  ├── {feature}-definition.service.ts     # CRUD (NestJS-coupled)
  ├── {feature}-definition.repository.ts  # Persistence (Prisma-coupled)
  ├── schemas/                            # Zod + payload types
  └── lib/                                # PORTABLE
      ├── extract-row-values.ts           # snapshot schema + content → flat row
      ├── normalize-field-type.ts         # field type normalization rules
      └── compute-summaries.ts            # numeric aggregation (count/sum/avg)
```

If a second consumer (e.g. a dedicated reporting microservice) needs these functions, the `lib/` directory moves to a shared package with zero rewrite.

## Frontend Example: A Reporting Feature

```
src/features/{feature}/
  ├── api/                                  # TanStack Query hooks (React-coupled)
  ├── components/                           # UI components (React-coupled)
  ├── hooks/                                # React hooks (React-coupled)
  └── lib/                                  # PORTABLE
      ├── merge-partitions.ts               # partition merge logic
      ├── compute-summaries.ts              # client-side numeric re-computation
      ├── serialize-csv.ts                  # CSV export serializer
      └── serialize-xlsx.ts                 # XLSX export serializer
```

If another app needs the same CSV/XLSX serialization, extract `lib/` to a shared package.

## Portable vs Framework-Coupled Decision

| Function | Input | Output | Framework Deps | Location |
|---|---|---|---|---|
| `extractRowValues(schema, content)` | plain objects | flat row object | None | `lib/` |
| `computeSummaries(partitions)` | array of objects | summary object | None | `lib/` |
| `serializeCsv(rows, columns)` | arrays | string | None | `lib/` |
| `{Feature}QueryService.generateResult()` | payload type | void (stores result) | NestJS, Prisma | `service` |
| `useRunMutation()` | — | mutation hook | React, TanStack | `hooks/` |
