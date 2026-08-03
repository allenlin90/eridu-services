# Frontend Code Quality — Detailed References

Extended guidance on component patterns, route decomposition, and routing access.

## App-Level Refactor Register

Before proposing a frontend cleanup or refactor in `erify_studios`:
- `apps/erify_studios/docs/FRONTEND_TECH_DEBT.md` — check first to avoid duplicate proposals

## Component Best Practices

### Colocation
Keep components, functions, styles, and state close to where used.

```typescript
// ✅ GOOD: Component-specific hook colocated
import { useUserStats } from './useUserStats';

// ❌ BAD: Hook in global hooks folder when only used here
import { useUserStats } from '@/hooks/useUserStats';
```

### Avoid Nested Render Functions
```typescript
// ❌ BAD
function Dashboard() {
  function renderUserList() { return <ul>...</ul>; }
  return <div>{renderUserList()}</div>;
}

// ✅ GOOD
function UserList() { return <ul>...</ul>; }
function Dashboard() { return <div><UserList /></div>; }
```

### Grouped Props Pattern
```typescript
// ❌ Too many props
function UserCard({ name, email, avatar, role, department, location, phone }) {}

// ✅ Grouped
function UserCard({ user }: { user: User }) {}
```

### Low-Value Component Extraction Gate
1. Keep inline when: single element, no internal state/effects, no conditional complexity, used once
2. Extract only when: reused, has meaningful behavior, materially improves readability, or establishes stable contract

## Large Route Decomposition

Trigger: Route file >200 LOC or mixes 3+ concerns.

```typescript
// routes/studios/$studioId/dashboard.tsx — composition only
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

// features/studio-dashboard/hooks/use-studio-dashboard-view-model.ts
export function useStudioDashboardViewModel() {
  // router state + query orchestration + derived values
  return { dateNav, summary, showList };
}
```

## Route Access and Layout Pattern

- Define studio route permissions in one central map (`src/lib/constants/studio-route-access.ts`)
- Use shared `useStudioAccess` hook and `StudioRouteGuard` for protected routes
- Sidebar visibility derives from the same policy map
- Route sets use consistent wrapper: `PageContainer` for studio, `AdminLayout` for system
- For studio-scoped roster/list pages: route = composition boundary, feature hook = URL/query wiring, columns + dialogs = feature-local config/components

### Shared views rendered from multiple access tiers

When a single presentation component is reused across routes with different role guards (e.g. an admin/manager review page and a member self-view both render `MemberCompensationsView`), any cross-route navigation embedded in that view must be gated by an opt-in prop with a safe default. The shared component cannot assume the caller's tier, and the route under a stricter guard will happily render links to pages that the route's own viewers will be bounced from by `StudioRouteGuard`.

Pattern:

```tsx
type Props = {
  // …existing props
  /**
   * Default `false`. Opt in only from surfaces whose own role guard is at least
   * as strict as the link destination's. Member self-view leaves this off.
   */
  enableShiftDrillIn?: boolean;
};

// Admin/manager route
<MemberCompensationsView … enableShiftDrillIn />

// Member self-view route
<MemberCompensationsView … />  // drill-in stays off
```

In tests, assert *both* directions: (a) link is rendered and points where expected when the flag is on; (b) link is absent and the optional column header is not rendered when the flag is off. Default-off makes new consumers safe; default-on makes new self-view surfaces a regression risk.
