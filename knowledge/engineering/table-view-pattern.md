# Table View Component Pattern Standard

okf_version: "0.2"
type: engineering_standard
status: active
stale_after: "2027-01-01"

## Overview

Canonical TanStack Table v8 implementation standards across SPA applications (`erify_studios`, `erify_creators`).

## Table Component Rules

1. **TanStack Table v8**: Standardize data tables on `@tanstack/react-table` with typed column definitions (`ColumnDef<TData, TValue>[]`).
2. **URL Search Parameter State**: Table pagination (`page`, `pageSize`), sorting (`sortBy`, `sortOrder`), and search/filter states must sync bi-directionally with TanStack Router search params.
3. **Empty & Error State UI**: Render explicit `<TableEmptyState />` and `<TableErrorState onRetry={...} />` elements when data is empty or query fails.
4. **Pagination Controls**: Standardize page size selection on `@eridu/ui` `<TablePagination />` component.
