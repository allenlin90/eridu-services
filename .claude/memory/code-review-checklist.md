# Code Review Checklist

Use this checklist before committing code or reviewing PRs.

## 🔍 General Code Quality

### Imports & Dependencies
- [ ] No unused imports
- [ ] Path aliases used (`@/` not relative paths like `../../../`)
- [ ] Workspace packages use `workspace:*` version
- [ ] No `any` types (use `unknown` if type truly unknown)

### Naming & Style
- [ ] Follows naming conventions (camelCase, PascalCase, snake_case per context)
- [ ] File names match content (PascalCase for components, kebab-case for utils)
- [ ] No magic numbers/strings (use constants)
- [ ] Clear, descriptive variable/function names

### Error Handling
- [ ] All async operations have error handling
- [ ] User-facing errors are clear and actionable
- [ ] No swallowed errors (empty catch blocks)
- [ ] Validation errors include field names

---

## 🏗️ Architecture Compliance (CRITICAL)

### Backend (NestJS) - Service Layer

#### ✅ Payload Pattern (REQUIRED)
```typescript
// ✅ CORRECT
import { Task } from '@prisma/client';  // ONLY entity type
import type { CreateTaskPayload } from './schemas';

async create(payload: CreateTaskPayload): Promise<Task>

// ❌ WRONG
import { Prisma } from '@prisma/client';
async create(data: Prisma.TaskCreateInput): Promise<Task>
```

- [ ] Service imports **ONLY** entity type from Prisma (`Task`, `User`, etc.)
- [ ] Service does **NOT** import `Prisma` namespace
- [ ] All method signatures use Payload types, not Prisma types
- [ ] No `Prisma.*WhereInput`, `Prisma.*CreateInput`, `Prisma.*UpdateInput` in service

#### ✅ Schema Layer (REQUIRED)
- [ ] Payload types defined: `CreateXPayload`, `UpdateXPayload`
- [ ] Domain filter types defined (not Prisma types)
- [ ] DTOs use `createZodDto()` from nestjs-zod
- [ ] Transformation schemas use `.pipe()` for validation
- [ ] Assert helpers exist for runtime validation

#### ✅ Repository Layer
- [ ] All Prisma queries in repository, **NEVER** in service
- [ ] Query building methods are private in repository
- [ ] Repository accepts domain filter types, not Prisma types
- [ ] Extends `BaseRepository` with proper wrapper

#### ✅ Controller Layer
- [ ] Uses DTOs for input validation
- [ ] Transforms service response using DTO schemas
- [ ] Never returns raw Prisma entities
- [ ] Swagger decorators present (`@ApiOperation`, `@ApiTags`)

### ID & UID Handling
- [ ] Never expose internal BigInt IDs in API responses
- [ ] Always use UID strings externally (`user_abc123`)
- [ ] UIDs generated via `this.generateUid()` in service
- [ ] UID prefix matches domain (`user_`, `studio_`, `task_`)

### Authentication & Authorization
- [ ] Public endpoints use `@SkipJwtAuth()`
- [ ] Admin endpoints use `@Admin()`
- [ ] Studio-scoped endpoints use `@StudioProtected([roles])`
- [ ] `@CurrentUser()` used instead of `@Req() req`
- [ ] Guards in correct order (check module providers)

---

## 🎨 Frontend (React)

### Component Quality
- [ ] Components are focused (single responsibility)
- [ ] Props properly typed (no `any`)
- [ ] Conditional rendering handles loading/error states
- [ ] No inline object/function definitions in JSX (use `useMemo`/`useCallback`)

### React Compiler / react-hooks ESLint Rules (STRICT)
- [ ] No hooks (`useState`, `useMemo`, `useEffect`, etc.) called **after** a conditional early return — extract an inner component if needed
- [ ] No `setState` called **synchronously inside** `useEffect` — use keyed state or derived values instead (`react-hooks/set-state-in-effect`)
- [ ] No impure function calls (`Date.now()`, `Math.random()`) in render or inside `useMemo` — use `useState(() => Date.now())` lazy initializer (`react-hooks/purity`)
- [ ] Dialogs/Sheets using Radix have `<DialogDescription>` (not a bare `<p>`) for `aria-describedby` wiring

### DataTable / Studio List Patterns
- [ ] `searchColumnId` in `useTableUrlState`, `searchColumn` on `<DataTableToolbar>`, and filter id read in hook are the **same string** (see §14.1 design doc for the bug this prevents)
- [ ] `getRowId={(row) => row.id}` passed to `<DataTable>` whenever the table is paginated and rows are selectable — prevents index-collision bug across pages
- [ ] Cross-page selection uses the accumulator pattern (`useEffect` keyed by item ID), not `shows[parseInt(k)]` index lookup
- [ ] Member/assignee pickers use `AsyncCombobox` from `@eridu/ui`, not `<Select>`, with client-side `onSearch` filtering

### TanStack Query
- [ ] Query keys follow convention: `['domain', action, ...params]`
- [ ] Mutations invalidate related queries
- [ ] Error handling in queries/mutations
- [ ] Loading states shown to user
- [ ] No data fetching outside TanStack Query (no useEffect)

### API Integration
- [ ] API types imported from `@eridu/api-types/{domain}`
- [ ] Response validated with Zod schema
- [ ] Axios errors handled gracefully
- [ ] Bearer token automatically attached (no manual auth)

### Forms
- [ ] `react-hook-form` + `zodResolver`
- [ ] Validation schema from `@eridu/api-types` (reuse backend schema)
- [ ] Form/dialog field inventory matches the intended product/API contract; omitted fields are explicitly documented
- [ ] Date/time editing uses `DatePicker` / `DateTimePicker` from `@eridu/ui`, not native browser date/datetime inputs unless exception documented
- [ ] Searchable inputs have an explicit per-field data source (`scoped API` or documented local filter)
- [ ] `AsyncCombobox` / `AsyncMultiCombobox` `onSearch` is not a placeholder no-op
- [ ] Tests or direct verification prove typing into searchable fields changes query state or the documented local filter state
- [ ] Error messages displayed per field
- [ ] Submit button disabled during submission

### Accessibility
- [ ] Semantic HTML used
- [ ] Interactive elements keyboard accessible
- [ ] Form labels present
- [ ] Error messages announced (aria-live regions)

---

## 📦 Shared Packages

### @eridu/api-types
- [ ] Snake_case for all API fields
- [ ] Schemas exported per domain (subpath exports)
- [ ] Constants exported alongside schemas
- [ ] Types inferred from schemas (`z.infer<typeof schema>`)
- [ ] No business logic in schemas (pure validation)

### @eridu/ui
- [ ] Components use CVA for variants
- [ ] Tailwind classes (no inline styles)
- [ ] Accessible (keyboard nav, ARIA)
- [ ] Exported from `index.ts`

### @eridu/i18n
- [ ] Messages in JSON files (not hardcoded strings)
- [ ] Use compiled message functions, not raw strings
- [ ] Handle pluralization correctly

---

## 🗄️ Database & Schema

### Prisma Schema
- [ ] Models use `@map("snake_case")` for DB columns
- [ ] BigInt for internal IDs
- [ ] String for UIDs (with `@unique`)
- [ ] Timestamps: `createdAt`, `updatedAt`, `deletedAt?`
- [ ] Relations properly defined (both sides)
- [ ] Indexes on frequently queried columns

### Migrations
- [ ] Migration tested locally before committing
- [ ] No data loss (handles existing records)
- [ ] Reversible if possible (down migration)
- [ ] Named descriptively (`add_tasks_table`, not `migration_1`)

---

## 🧪 Testing

### Unit Tests (Services)
- [ ] Repository mocked (no actual DB calls)
- [ ] All public methods tested
- [ ] Edge cases covered (null, empty, invalid input)
- [ ] Error paths tested

### Integration Tests (Controllers)
- [ ] Supertest for HTTP requests
- [ ] Auth tested (valid token, invalid token, no token)
- [ ] Validation tested (invalid input)
- [ ] Database state verified after mutations

### Frontend Tests
- [ ] Components render without errors
- [ ] User interactions tested (click, type, submit)
- [ ] API calls mocked (MSW or similar)
- [ ] Accessibility checked (Testing Library queries)

---

## 🔒 Security

### Input Validation
- [ ] All user input validated with Zod schemas
- [ ] SQL injection prevented (Prisma parameterizes)
- [ ] XSS prevented (React escapes by default, no `dangerouslySetInnerHTML`)
- [ ] CSRF protection (session cookies are SameSite)

### Authentication
- [ ] Tokens short-lived (15min)
- [ ] Refresh token rotation implemented
- [ ] Passwords never logged
- [ ] Sensitive data redacted in logs

### Authorization
- [ ] User can only access their own data (unless admin)
- [ ] Studio membership verified before operations
- [ ] Role checks use guard decorators, not inline code

---

## 📊 Performance

### Backend
- [ ] N+1 queries avoided (use `include` wisely)
- [ ] Pagination on large datasets
- [ ] Indexes on filtered/sorted columns
- [ ] Expensive operations cached or queued

### Frontend
- [ ] Images optimized (lazy loading, correct format)
- [ ] Large lists virtualized (`@tanstack/react-virtual`)
- [ ] TanStack Query cache configured (staleTime, cacheTime)
- [ ] Bundle size checked (no unnecessary dependencies)

---

## 📝 Documentation

### Code Comments
- [ ] Complex logic has comments explaining **why**, not what
- [ ] Public APIs have JSDoc comments
- [ ] TODO comments include ticket/issue number
- [ ] No commented-out code (use git history)

### API Documentation
- [ ] Swagger annotations on all endpoints
- [ ] Request/response examples
- [ ] Error responses documented
- [ ] Authentication requirements specified

---

## 🚀 Pre-Commit Checklist

Before running `git commit`:

- [ ] Code compiles without errors (`pnpm build`)
- [ ] Linter passes (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)
- [ ] Dependencies aligned (`pnpm sherif`)
- [ ] No console.logs or debugger statements
- [ ] Commit message follows conventional commits
- [ ] Reviewed own changes (git diff)
- [ ] Architecture compliance verified (see above)

---

## 🚨 Red Flags (Never Commit)

- ❌ `Prisma.*` types in service method signatures
- ❌ Prisma queries in service layer
- ❌ `any` types without explicit justification
- ❌ Hardcoded credentials or secrets
- ❌ BigInt IDs in API responses
- ❌ Missing error handling
- ❌ Unauthenticated sensitive endpoints
- ❌ Direct DOM manipulation in React (use refs)
- ❌ Mutating props or state directly
- ❌ Unused imports/variables/files

---

## 📌 Quick Decision Trees

### "Should I create a new model?"
```
Is this a distinct domain entity? → YES → Create model
                                   ↓ NO
Is it just a DTO variation?       → NO → Add to existing schema
                                   ↓ YES
Is it a relation/join table?      → Create model, no service
```

### "Where does this query logic go?"
```
Simple CRUD by ID/UID?           → BaseRepository methods
                                  ↓
Complex filtering?               → Custom repository method
                                  ↓
Business logic (pricing, etc)?  → Service layer
                                  ↓
API-specific transformation?     → Controller (use DTO)
```

### "Where does this validation go?"
```
API input shape?                 → Zod schema in @eridu/api-types
                                  ↓
Business rule?                   → Service layer
                                  ↓
Database constraint?             → Prisma schema
                                  ↓
React form?                      → Reuse API schema with zodResolver
```

---

## 🔗 Related Documentation

- [Ideal Pattern](./ideal-pattern.md) - Template for new models
- [Known Issues](./known-issues.md) - What NOT to copy
- [Auth Patterns](./auth-patterns.md) - Guards and decorators
- [Schema Patterns](./schema-patterns.md) - DTO transformations
