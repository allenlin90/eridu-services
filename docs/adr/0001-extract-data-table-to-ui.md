# Architecture Decision Record: Extracting DataTable to Shared UI Package

## Date
March 3, 2026

## Status
Accepted

## Context
During the alignment of the `erify_creators` application with the `erify_studios` application architecture, we identified a need to build consistent, server-paginated, searchable list views in the Creators app (e.g., for the "Shows" feature).

The `erify_studios` app already contained a highly robust, feature-complete implementation of a Data Table (`src/components/data-table/`). This component suite includes advanced features like:
- Dynamic column visibility and ordering
- Server-side pagination and sorting state management
- Advanced filtering UX (search inputs, quick filters, popover filters)

The question was raised whether to:
1. Re-implement a simpler version in `erify_creators`.
2. Duplicate the complex component into `erify_creators`.
3. Extract the existing component from `erify_studios` into the shared monorepo package `@eridu/ui`.

## Decision
We decided to extract the `data-table` directory out of `erify_studios` and move it in its entirety into the shared `@eridu/ui` package so it can be consumed by both `erify_studios` and `erify_creators` (and any future apps).

## Rationale
Extracting the `DataTable` to the shared UI package is the right approach for the following reasons:

1. **Zero Domain Logic Coupling**: Upon inspection, the `data-table` component suite in `erify_studios` is entirely generic. It relies strictly on standard UI primitives (which are already in `@eridu/ui`), the `@tanstack/react-table` library, and `lucide-react` icons. It contains **no** studio-specific business logic, API calls, or model references.
2. **Standardization of the "Admin List Pattern"**: As documented in our `admin-list-pattern` skill, we rely heavily on standardized URL state synchronization and debounced filtering UX across the platform. Providing a single, shared `DataTableToolbar` and `DataTable` core guarantees UX consistency across all apps without duplicating the complex boilerplate required to wire up TanStack Table.
3. **Reduced Maintenance Burden**: Maintaining a single, centralized, and robust table component means bug fixes (such as resolving React Compiler memoization warnings) and feature enhancements benefit the entire monorepo immediately.
4. **Faster Feature Delivery**: By having a drop-in `DataTable` component ready in `@eridu/ui`, building out new list pages in `erify_creators` becomes an exercise in defining columns and connecting our standard API hooks, rather than rebuilding UI components.

## Consequences
- **Positive**: We achieve UI consistency across `erify_studios` and `erify_creators` for list views. We avoid duplicating thousands of lines of complex React code.
- **Positive**: New applications added to the monorepo will immediately have access to a robust, generic data table component.
- **Neutral**: The `@eridu/ui` package's internal complexity increases slightly by absorbing this advanced component, but the dependencies (`@tanstack/react-table`) were already present in its `package.json`.
