# Data Table Extraction (2026-03-03)

- **Context**: The `DataTable` components were previously located in `erify_studios/src/components/data-table`.
- **Change**: Extracted to the shared UI package at `@eridu/ui/components/data-table`.
- **Impact**: All feature apps (studios, creators, admin) must now import `DataTable` and its related components (`DataTableToolbar`, `DataTableColumnHeader`, etc.) from `@eridu/ui`.
- **Reference**: See `docs/engineering/DATA_TABLE_EXTRACTION.md` for full rationale.
