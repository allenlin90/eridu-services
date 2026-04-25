# erify_studios Frontend Refactoring Reference

> **Status**: Implemented reference
> **Scope**: `apps/erify_studios`
> **Purpose**: Baseline patterns for future frontend cleanup, including later `erify_creators` refactors.

## What This Cleanup Standardizes

- Standard paginated table views keep URL state in `useTableUrlState`, derive page count from real API metadata, render `DataTablePagination`, and use `placeholderData: keepPreviousData` for server-driven transitions.
- Selection that must survive page changes uses `useSelectedRowSnapshots()` instead of duplicating row-selection snapshot logic in route files.
- Admin CRUD dialogs use schema-bound fields for submitted data and render-only fields for read-only display values such as internal IDs.
- Searchable async combobox fields must wire `onSearch` to remote query state or documented local filtering. No-op search handlers are not an acceptable placeholder.
- Refactors should remove avoidable production `any` where a local API type, schema inference, or narrow value union already exists.

## Reference Implementations

- Table transition parity: `src/features/studio-show-creators/hooks/use-creator-mapping-shows.ts`
- Selected row snapshots: `src/features/studio-shows/hooks/use-selected-row-snapshots.ts`
- Typed admin display fields: `src/features/admin/components/admin-form-dialog.tsx`
- Legacy show lookup search wiring: `src/features/shows/components/hooks/use-show-type-field-data.ts`, `use-show-status-field-data.ts`, `use-show-standard-field-data.ts`, and `use-studio-room-field-data.ts`

## Review Checklist

- Route files remain composition boundaries; extract shared state or repeated table behavior into feature hooks only when it reduces meaningful duplication.
- URL params, route paths, filters, sort order, and row-selection behavior must stay stable during cleanup.
- Shared component APIs should not be redesigned inside broad cleanup branches unless the change is small, covered by tests, and required to remove an active inconsistency.
- Large mixed-concern files should be listed in `FRONTEND_TECH_DEBT.md` unless the cleanup can be completed safely in one focused batch.

## Verification

Run for `erify_studios` cleanup branches:

```bash
pnpm --filter erify_studios exec eslint .
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build
```

Also run the scanner before and after broad cleanup:

```bash
bash .agent/skills/engineering-best-practices-enforcer/scripts/scan-quality-signals.sh apps/erify_studios
```
