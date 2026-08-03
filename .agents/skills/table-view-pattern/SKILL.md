---
name: table-view-pattern
description: Implement TanStack Table v8, URL search parameter synchronization, pagination, and empty/error states.
---

# Table View Component Procedure

Thin procedural skill for implementing data tables in SPAs. Canonical table standards live in [`knowledge/engineering/table-view-pattern.md`](../../../knowledge/engineering/table-view-pattern.md).

## Task Workflow

1. **Define Columns**: Create typed `ColumnDef<TData, TValue>[]` with clear headers and cell formatters.
2. **Sync Search Params**: Bind pagination (`page`, `pageSize`) and search/filter fields to TanStack Router search params.
3. **Empty & Error UI**: Render explicit `<TableEmptyState />` and `<TableErrorState onRetry={...} />` handlers.
4. **Verification**: Run `pnpm --filter erify_studios test` or `pnpm --filter erify_creators test`.

## Canonical Knowledge Reference

- [`knowledge/engineering/table-view-pattern.md`](../../../knowledge/engineering/table-view-pattern.md)
