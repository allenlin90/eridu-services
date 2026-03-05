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

Use ESLint to enforce consistent file naming:

```javascript
// .eslintrc.cjs
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

## General Best Practices

1.  **Strict Props**: Define specific interfaces for props, avoid `any` or broad `object` types.
2.  **Server State separation**: Use TanStack Query for server data; use `React.useState`/`useReducer` only for local UI state.
3.  **Composition over Inheritance**: Build complex UIs by composing small, focused components.
4.  **Consistent Code Style**: Use ESLint and Prettier to enforce consistency across the codebase.
5.  **No repeated magic limits**: Centralize repeated pagination/fetch limits in named constants instead of duplicating raw numbers across routes/components.

## Checklist

- [ ] `pnpm lint` passes without errors.
- [ ] `pnpm test` passes.
- [ ] Component names match their filenames.
- [ ] Complex logic extracted to custom hooks.
