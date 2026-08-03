# SOLID Principles — Frontend (React / TypeScript)

SOLID was designed for OOP. In React's functional/component-based world, these principles must be **reinterpreted** — the goals (cohesion, extensibility, substitutability, minimal coupling, abstraction) remain the same, but the mechanisms are different.

Apply these principles to all frontend code: components, hooks, utilities, API layers, and state management.

---

## S — Single Responsibility Principle (SRP)

**A component, hook, or utility should have one and only one reason to change.**

- **Components**: Split into **presentational** (UI-only) and **container** (data-fetching / state logic) components. A component rendering a list should not also fetch data.
- **Hooks**: One concern per hook. Separate `useFetchUsers` from `useUserFilters` from `useUserSorting`.
- **Utilities**: Keep pure utility functions in separate files, not inline in components.
- **Files**: One exported component per file as a general rule. Co-locate small sub-components only if they are tightly coupled and not reused.

```tsx
// ❌ BAD — component fetches data AND manages filters AND renders UI
function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'date'>('name');

  useEffect(() => {
    fetch(`/api/users?search=${search}&sort=${sort}`)
      .then(r => r.json())
      .then(setUsers);
  }, [search, sort]);

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <select value={sort} onChange={e => setSort(e.target.value)}>...</select>
      <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
    </div>
  );
}

// ✅ GOOD — each concern lives in its own unit
function useUsers(params: UserQueryParams) {
  return useQuery({ queryKey: ['users', params], queryFn: () => fetchUsers(params) });
}

function useUserFilters() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortField>('name');
  return { search, setSearch, sort, setSort };
}

function UserListPage() {
  const filters = useUserFilters();
  const { data: users } = useUsers(filters);
  return (
    <div>
      <UserToolbar {...filters} />
      <UserList users={users ?? []} />
    </div>
  );
}
```

### SRP Decision Guide

| Smell | Action |
|:---|:---|
| Component > 150 lines | Split into sub-components or extract hooks |
| Hook manages multiple unrelated state slices | Split into focused hooks |
| Utility function imported by many unrelated components | Move to a shared `utils/` or `lib/` module |
| Component uses `useEffect` for data fetching | Extract to a TanStack Query hook |

---

## O — Open/Closed Principle (OCP)

**Components and hooks should be open for extension but closed for modification.**

- **Composition over Props Flags**: Prefer `children`, render props, and slot patterns over adding boolean prop flags that fork behavior inside a component.
- **Extensible Components**: Design shared components to accept extensions (e.g. toolbar actions, table column renderers, header/footer slots) rather than hardcoding behaviors.
- **Hook Composition**: Build complex hooks by composing simpler ones, not by adding parameters to a growing mega-hook.
- **Variant Patterns**: Use `cva` (class-variance-authority) or similar for style variants instead of conditional className logic.

```tsx
// ❌ BAD — every new layout variant requires editing the component internals
function Card({ variant }: { variant: 'basic' | 'featured' | 'compact' }) {
  if (variant === 'basic') return <div className="card">...</div>;
  if (variant === 'featured') return <div className="card card-featured">...</div>;
  if (variant === 'compact') return <div className="card card-compact">...</div>;
}

// ✅ GOOD — extend via composition, base component doesn't change
function Card({ className, children, header, footer }: CardProps) {
  return (
    <div className={cn('card', className)}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// New variants are just compositions:
function FeaturedCard({ children }: { children: ReactNode }) {
  return (
    <Card className="card-featured" header={<Badge>Featured</Badge>}>
      {children}
    </Card>
  );
}
```

### OCP Indicators

| Smell | Refactor To |
|:---|:---|
| Growing `if/switch` on a `variant` prop | Composition / wrapper components |
| Adding boolean flags (`showHeader`, `showFooter`) | Slot props (`header`, `footer`, `actions`) |
| Editing a shared component for one consumer's need | Wrapper component or render prop |
| Hook grows a new param for each use case | Compose smaller hooks |

---

## L — Liskov Substitution Principle (LSP)

**A component or hook should be safely substitutable wherever its contract is expected.**

In React this means: **honor the contract your component or hook exposes**.

- **HTML Contract**: A component accepting `HTMLAttributes<HTMLDivElement>` must spread them onto the root element. Consumers must be able to use it like a `<div>`.
- **Hook Contracts**: Hooks returning the same shape (e.g. `{ data, isLoading, error }`) should be interchangeable at the call site.
- **Forwarded Refs**: If a component wraps a native element, forward `ref` so consumers can access the DOM node as expected.
- **Event Handlers**: If a component accepts `onChange`, fire it with the same signature the consumer expects. Do not silently change the event payload.

```tsx
// ❌ BAD — Button "looks like" a button but doesn't spread HTML attributes
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick}>{label}</button>;
  // Missing: disabled, type, className, aria-*, etc.
}

// ✅ GOOD — fully substitutable for a native <button>
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <button ref={ref} className={cn('btn', className)} {...props}>
      {children}
    </button>
  ),
);
```

```tsx
// ❌ BAD — hooks have different return shapes for the same concern
function useUserList() { return { users: [], loading: true }; }
function useShowList() { return { data: [], isLoading: true }; }

// ✅ GOOD — consistent contract across similar hooks
function useUserList() { return { data: [], isLoading: true, error: null }; }
function useShowList() { return { data: [], isLoading: true, error: null }; }
```

### LSP Checklist for Components

- ✅ Spread `...rest` props onto the root element.
- ✅ Forward `ref` for components wrapping native elements.
- ✅ Accept and merge `className` instead of ignoring it.
- ✅ Keep `onChange`, `onClick`, etc. signatures consistent with HTML conventions.
- ❌ Never silently ignore passed props (especially `disabled`, `aria-*`).

---

## I — Interface Segregation Principle (ISP)

**Components and hooks should not force consumers to provide more than they need.**

- **Minimal Props**: Only accept props a component actually uses. Avoid passing an entire entity object when only `id` and `name` are needed.
- **Focused Hooks**: One data concern per hook. Do not create a mega-hook (`useEverything`) that fetches and manages unrelated state.
- **Lean Contexts**: Split large contexts by domain (`UserContext`, `ThemeContext`) instead of one `AppContext` that re-renders everything.

```tsx
// ❌ BAD — component receives the entire User object but only uses two fields
interface UserAvatarProps {
  user: User; // User has 20+ fields, but only avatarUrl and name are used
}

function UserAvatar({ user }: UserAvatarProps) {
  return <img src={user.avatarUrl} alt={user.name} />;
}

// ✅ GOOD — minimal, focused interface
interface UserAvatarProps {
  avatarUrl: string;
  name: string;
}

function UserAvatar({ avatarUrl, name }: UserAvatarProps) {
  return <img src={avatarUrl} alt={name} />;
}
```

```tsx
// ❌ BAD — one context holds everything, causing unnecessary re-renders
const AppContext = createContext<{
  user: User; theme: Theme; notifications: Notification[]; locale: string;
}>(/* ... */);

// ✅ GOOD — segregated contexts
const UserContext = createContext<UserContextValue>(/* ... */);
const ThemeContext = createContext<ThemeContextValue>(/* ... */);
const NotificationContext = createContext<NotificationContextValue>(/* ... */);
```

### ISP Decision Guide

| Smell | Action |
|:---|:---|
| Component prop is a full entity object | Destructure to only needed fields |
| Context causes re-renders in unrelated components | Split into domain-specific contexts |
| Hook returns > 5 values | Split into focused hooks |
| Component accepts > 10 props | Group related props or refactor via composition |

---

## D — Dependency Inversion Principle (DIP)

**Components and hooks should depend on abstractions, not concrete implementations.**

In React, "abstractions" are: typed hooks, context interfaces, and API layer declarations — not direct `fetch`/`axios` calls or concrete module imports.

- **API Layer Abstraction**: Access APIs through typed request declarations and TanStack Query hooks (as enforced by frontend-api-layer skill), not direct `fetch`/`axios` calls in components.
- **Context as DI**: Use React Context to inject services (API clients, analytics, feature flags) rather than directly importing concrete modules.
- **Hook Abstractions**: Wrap third-party libraries in custom hooks so components never directly depend on the library's API.

```tsx
// ❌ BAD — component tightly coupled to axios and a specific endpoint
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    axios.get('/api/users').then(r => setUsers(r.data));
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// ✅ GOOD — depends on an abstraction (typed query hook)
function UserList() {
  const { data: users } = useUsers();
  return <ul>{users?.map(u => <UserListItem key={u.id} user={u} />) ?? null}</ul>;
}
```

```tsx
// ❌ BAD — component directly imports a concrete analytics library
import { track } from 'mixpanel-browser';

function CheckoutButton() {
  return <button onClick={() => { track('checkout_clicked'); }}>Checkout</button>;
}

// ✅ GOOD — depends on an abstraction via context
function CheckoutButton() {
  const { track } = useAnalytics(); // provided via AnalyticsProvider
  return <button onClick={() => { track('checkout_clicked'); }}>Checkout</button>;
}
```

### DIP Decision Guide

| Smell | Action |
|:---|:---|
| Component imports `axios` / `fetch` directly | Wrap in a typed API hook |
| Component imports a 3rd-party SDK directly | Wrap in a context-provided hook |
| Test requires mocking module internals | Inject via context or hook parameter |
| Swapping a library requires editing many files | Abstract behind a custom hook/provider |

---

## Codebase Example: Studio Creator Roster Dialogs

The `studio-creator-roster` feature provides a concrete before/after example of SRP, OCP, and ISP applied to a real dialog split.

### Before: Combined `AddStudioCreatorDialog` (violation)

The original component managed two unrelated flows in a single file using a `mode` state toggle (`'search' | 'create'`):

- **Search mode**: searched the global creator catalog, picked an existing creator, set compensation defaults
- **Create mode**: created a new global `Creator` (with optional user link), set compensation defaults

This violated SRP (two domain operations, two reasons to change) and OCP (adding a new flow required editing the existing component's `if/switch` on `mode`).

### After: Split into three focused units

**`AddStudioCreatorDialog`** (`add-studio-creator-dialog.tsx`)
- Single responsibility: search the catalog, pick an existing creator, add to roster
- Depends only on `useAddStudioCreatorToRoster` and `useCreatorCatalogQuery`
- No mode state, no create form fields

**`OnboardCreatorDialog`** (`onboard-creator-dialog.tsx`)
- Single responsibility: create a new global creator identity and onboard them
- Depends only on `useOnboardStudioCreator` and `useStudioCreatorOnboardingUsersQuery`
- No catalog search, no mode toggle

**`CreatorCompensationFields`** (`creator-compensation-fields.tsx`)
- Extracted shared compensation UI (Default Rate, Compensation Type, Commission Rate)
- Receives only the props it uses — no dialog-level state leaks in (ISP)
- Both dialogs compose it without modification (OCP): when compensation fields change, only `CreatorCompensationFields` needs to update

```tsx
// OCP in action — both dialogs are closed for modification on compensation changes:
<CreatorCompensationFields
  defaultRate={defaultRate}
  defaultRateType={defaultRateType}
  defaultCommissionRate={defaultCommissionRate}
  onDefaultRateChange={setDefaultRate}
  onDefaultRateTypeChange={setDefaultRateType}
  onDefaultCommissionRateChange={setDefaultCommissionRate}
  disabled={mutation.isPending}
/>
```

**ISP** — each dialog receives only `{ studioId, open, onOpenChange }`. The roster table renders both independently with their own open state — no shared mode prop or combined handler.

**DIP** — both dialogs depend on their own mutation hooks (`useAddStudioCreatorToRoster`, `useOnboardStudioCreator`) injected via TanStack Query, not on each other or on parent page state.

---

## Related Skills

- **[Frontend Code Quality](../../frontend-code-quality/SKILL.md)**: Linting and code standards.
- **[Frontend API Layer](../../frontend-api-layer/SKILL.md)**: API abstraction patterns.
- **[Frontend State Management](../../frontend-state-management/SKILL.md)**: State patterns.
- **[Frontend UI Components](../../frontend-ui-components/SKILL.md)**: Shared component guidelines.
- **[Frontend Performance](../../frontend-performance/SKILL.md)**: Re-render optimization.
