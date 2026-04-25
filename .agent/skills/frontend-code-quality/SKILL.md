---
name: frontend-code-quality
description: Provides code quality standards for frontend applications. This skill should be used when configuring linting rules, organizing file structures, or ensuring consistency across React applications.
---

# Frontend Code Quality

This skill defines the quality standards specific to frontend applications.

## Linting & Formatting

We use **ESLint 9** with a shared configuration (`@eridu/eslint-config`).

- **Command**: `pnpm lint` (runs `eslint . --fix`)
- **Rules**:
    - No `any` types.
    - React Hooks rules enforced (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`).
    - Standard imports sorting.

## Testing

We use **Vitest** for unit and component testing.

- **Command**: `pnpm test`
- **Environment**: `happy-dom`
- **Testing Library**: `@testing-library/react` for component interactions.

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@eridu/ui/components/button';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});
```

## Absolute Imports

Always configure and use absolute imports to avoid messy relative paths like `../../../component`. This makes it easier to move files around without breaking imports.

**Configuration** (`tsconfig.json`):

```json
"compilerOptions": {
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

**Usage**:

```typescript
// ✅ GOOD: Absolute import
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

// ❌ BAD: Relative import
import { Button } from '../../../components/Button';
```

**Benefits**:
- Files can be moved without updating imports
- Clear distinction between workspace packages (`@eridu/ui`) and source code (`@/*`)
- More readable and maintainable

## File Structure & Naming

### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with use prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Routes**: File-based routing conventions of TanStack Router (e.g., `posts/$postId.tsx`)
- **Folders**: kebab-case (e.g., `user-profile/`, `auth-forms/`)

### Enforcing Naming Conventions

Use ESLint flat config to enforce consistent file naming:

```javascript
// eslint.config.js
export default createConfig(
  { type: 'app', react: true },
  {
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          'src/**/': 'KEBAB_CASE',
        },
      ],
    },
  },
);
```

## Component Best Practices

### Colocation

Keep components, functions, styles, and state as close as possible to where they are used. This improves:
- Code readability and maintainability
- Performance (reduces unnecessary re-renders)
- Developer experience (easier to find related code)

```typescript
// ✅ GOOD: Component-specific hook colocated
// src/features/dashboard/components/UserStats.tsx
import { useUserStats } from './useUserStats';

export function UserStats() {
  const stats = useUserStats();
  return <div>{/* ... */}</div>;
}

// ❌ BAD: Hook in global hooks folder when only used here
import { useUserStats } from '@/hooks/useUserStats';
```

### Avoid Large Components with Nested Render Functions

Extract UI units into separate components instead of using nested render functions.

```typescript
// ❌ BAD: Nested render function
function Dashboard() {
  function renderUserList() {
    return <ul>{/* ... */}</ul>;
  }
  
  return <div>{renderUserList()}</div>;
}

// ✅ GOOD: Separate component
function UserList() {
  return <ul>{/* ... */}</ul>;
}

function Dashboard() {
  return (
    <div>
      <UserList />
    </div>
  );
}
```

### Form Display Fields

When a generic form dialog needs to show a read-only value that is not part of
the submit schema, model it as a render-only/display field instead of casting the
field name into the schema. This keeps form payload typing honest and avoids
patterns like `name: 'id' as any` for copy-only IDs.

Reference: `apps/erify_studios/src/features/admin/components/admin-form-dialog.tsx`.

### Large Route Decomposition Pattern

When a route file grows beyond a maintainable size, split it into clear boundaries:

1. **Route container**: owns router params/search parsing, top-level composition, and guarded wiring.
2. **Route-specific hooks**: own derived state, query orchestration, and route state transitions.
3. **Presentation components**: own table/cards/layout rendering with explicit props.

Use this trigger:
- Route file is over ~200 LOC, or
- Route mixes 3 or more concerns (search param logic, date/state derivation, query orchestration, complex UI rendering).

Refactor target shape:

```typescript
// routes/studios/$studioId/dashboard.tsx
export function DashboardRoute() {
  const vm = useStudioDashboardViewModel();
  return (
    <PageLayout>
      <DashboardDateNavigationCard {...vm.dateNav} />
      <OperationalDayShowsSummaryCard {...vm.summary} />
      <OperationalDayShowListCard {...vm.showList} />
    </PageLayout>
  );
}
```

```typescript
// features/studio-dashboard/hooks/use-studio-dashboard-view-model.ts
export function useStudioDashboardViewModel() {
  // router state + query orchestration + derived values
  return { dateNav, summary, showList };
}
```

Review expectation:
1. Validate extraction value (readability, testability, or stable UI contract).
2. Preserve behavior and URL contracts (search params, pagination, filters).
3. Avoid cosmetic-only extraction that adds indirection without reducing complexity.

### Paginated Route Consistency

For standard server-driven paginated routes, do not invent route-local pagination patterns.

Implementation baseline:
- `useTableUrlState` owns URL pagination state
- the feature hook/controller updates `setPageCount` from real API metadata
- paginated queries use `placeholderData: keepPreviousData`
- shared `DataTablePagination` renders the footer unless the UX is intentionally different and documented

Review expectation:
1. Challenge any manual next/prev button implementation on a standard paginated route.
2. Treat fallback clamps such as `totalPages ?? 1` during loading as correctness bugs.
3. Treat missing previous-data preservation on paginated queries as a UX consistency finding.

### Avoid Low-Value Component Extraction

Do not extract a component if it only wraps a single primitive element with fixed styling and one callback, unless there is a clear reuse or complexity need.

Use this extraction gate:

1. Keep inline when all are true:
   - single element (`Button`, `div`, etc.)
   - no internal state/effects
   - no conditional rendering complexity
   - used in one place
2. Extract only when at least one is true:
   - reused across multiple routes/features
   - has meaningful internal behavior (state/effects/derived logic)
   - materially improves readability by removing complex branching
   - establishes a stable UI contract shared by multiple callers

Review expectation:

1. If extracting, state the value (reuse, complexity reduction, or contract boundary).
2. If not, prefer inline code to avoid indirection and file churn.

### Limit Props

If a component accepts too many props, consider:
- Splitting into multiple components
- Using composition (children/slots)
- Grouping related props into objects

```typescript
// ❌ BAD: Too many props
function UserCard({ name, email, avatar, role, department, location, phone }) {
  // ...
}

// ✅ GOOD: Grouped props
interface User {
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  location: string;
  phone: string;
}

function UserCard({ user }: { user: User }) {
  // ...
}
```

## Conditional Rendering — Always Use Ternary

**Rule**: Use explicit ternary operators instead of `&&` for conditional rendering. The `&&` operator renders the left operand when falsy, causing `0` and `NaN` to appear as text in the DOM.

```tsx
// ❌ Bug: renders "0" in the DOM when count is 0
{count && <Badge>{count}</Badge>}

// ✅ Safe: nothing renders when count is 0
{count > 0 ? <Badge>{count}</Badge> : null}

// ❌ Bug: renders "NaN" if value is NaN
{value && <Stat>{value}</Stat>}

// ✅ Safe: explicit boolean check
{value != null && !isNaN(value) ? <Stat>{value}</Stat> : null}
```

This applies everywhere in JSX — component slots, list renders, and inline conditionals.

## General Best Practices

1.  **Strict Props**: Define specific interfaces for props, avoid `any` or broad `object` types.
2.  **Server State separation**: Use TanStack Query for server data; use `React.useState`/`useReducer` only for local UI state.
3.  **Composition over Inheritance**: Build complex UIs by composing small, focused components.
4.  **Consistent Code Style**: Use ESLint and Prettier to enforce consistency across the codebase.
5.  **No repeated magic limits**: Centralize repeated pagination/fetch limits in named constants instead of duplicating raw numbers across routes/components.

## Route Access and Layout Pattern

### Shared Route Access Policy (No Role Check Duplication)

- Define studio route permissions in one central map (`src/lib/constants/studio-route-access.ts`).
- Use one shared access hook (`useStudioAccess`) and one reusable guard component (`StudioRouteGuard`) for protected route UIs.
- Do not duplicate `profile?.studio_memberships?.find(...)` role checks in each route page.
- Sidebar visibility must be derived from the same policy map so navigation and route access stay aligned.
- When renaming a protected studio route, update the route file path, sidebar item URL/title, typed `Link`/`navigate`/`useTableUrlState` targets, and regenerate `src/routeTree.gen.ts` in the same change.

### Route Layout Responsibilities

- Use parent route files with `<Outlet />` as access/layout boundaries when multiple child pages share the same guard or layout.
- Keep business feature UI and data logic in leaf routes, not in parent layout routes.
- If a parent route exists only for grouping, keep it minimal and move policy checks to the nearest shared parent.
- Avoid mixing both patterns for the same feature area; prefer a single parent-guard + child-content approach.
- Route sets may use different shared layout components (for example: `PageContainer` for studio-scoped pages, `AdminLayout` for system pages), but each route set should have one clear reusable wrapper pattern and avoid page-level wrapper duplication.
- For `erify_studios`, treat `/system/*` as the reference pattern for DRY wrappers: parent route owns access boundary, each leaf page owns content and uses one shared leaf wrapper component.
- For `studios/$studioId/*`, keep page padding in the parent (`PageContainer`) and use `PageLayout` consistently in leaf pages instead of manual `<h1>`/description blocks.
- For studio-scoped roster/list pages with filters and dialogs, keep the route file as the composition boundary (`StudioRouteGuard` + `validateSearch` + page assembly), move URL/query wiring into a feature hook, and keep columns plus write dialogs in feature-local `config/` and `components/` files. Canonical references: `src/routes/studios/$studioId/members.tsx` and `src/routes/studios/$studioId/creators.tsx`.
- For new studio-scoped table CRUD pages, treat the nearest existing table route as the UX baseline before introducing a new toolbar/filter/action variant. Prefer `PageLayout` + `DataTable` + `DataTableToolbar` + feature hook wiring, and keep specialized operational pages unchanged when the new work is CRUD-only.

## Checklist

- [ ] `pnpm lint` passes without errors.
- [ ] `pnpm test` passes.
- [ ] Component names match their filenames.
- [ ] Complex logic extracted to custom hooks.
- [ ] Conditional rendering uses ternary (`condition ? <A /> : null`), not `&&` with numeric/nullable conditions.
- [ ] Read-only display values in schema-backed forms use render-only fields, not fake schema field names.
- [ ] Large route files (>200 LOC or mixed concerns) are decomposed into container + hooks + presentation components.
- [ ] Protected studio routes use `StudioRouteGuard` + shared access policy.
- [ ] Sidebar visibility and route access use the same route-access source.
- [ ] Leaf pages in each route set (`/system/*`, `studios/$studioId/*`) use their shared wrapper (`AdminLayout` or `PageLayout`) instead of duplicated page header markup.
