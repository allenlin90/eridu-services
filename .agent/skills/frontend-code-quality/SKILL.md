---
name: frontend-code-quality
description: Provides code quality standards for frontend applications. This skill should be used when configuring linting rules, organizing file structures, or ensuring consistency across React applications.
---

# Frontend Code Quality

Quality standards for frontend applications. See [references/code-quality-details.md](references/code-quality-details.md) for detailed patterns and code examples.

## Linting & Testing

- **ESLint 9** with `@eridu/eslint-config`: `pnpm lint`
- **Vitest** with `happy-dom` + `@testing-library/react`: `pnpm test`
- No `any` types. React Hooks rules enforced.

## Absolute Imports

Always use `@/*` imports (configured in `tsconfig.json`), never deep relative paths.

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Routes | TanStack Router file conventions | `posts/$postId.tsx` |
| Folders | kebab-case | `user-profile/` |

## Key Rules

1. **Colocation**: Keep components/hooks/state close to usage. Only share when used across features.
2. **No nested render functions**: Extract to separate components.
3. **Form Display Fields**: Model read-only values as render-only fields, not fake schema names.
4. **Conditional rendering**: Always use ternary (`condition ? <A /> : null`), not `&&` with numeric/nullable.
5. **Limit props**: Split components, use composition, or group related props.
6. **No repeated magic limits**: Centralize pagination/fetch limits in named constants.

## Large Route Decomposition

**Trigger**: Route >200 LOC or mixes 3+ concerns → split into container + hooks + presentation.

Pattern: route container + `useFeatureViewModel()` hook + presentation components.

## Paginated Route Consistency

- `useTableUrlState` owns URL pagination state
- Feature hook updates `setPageCount` from real API metadata
- Paginated queries use `placeholderData: keepPreviousData`
- Shared `DataTablePagination` renders footer

## Route Access Pattern

- Central access map in `src/lib/constants/studio-route-access.ts`
- Shared `StudioRouteGuard` + `useStudioAccess` — no duplicated role checks
- Sidebar visibility from same policy map
- Studio sidebar groups are purpose-based: `Planning` for schedules/shows/assignment setup, `Tasks` for downstream task operations, `People` for member/creator rosters, and `Studio Settings` for configuration surfaces.
- Keep `Creator Mapping` with `Planning`, not `People`; it assigns creators to shows rather than managing creator records.
- Consistent wrappers: `AdminLayout` for `/system/*`, `PageLayout` for studio pages
- **Shared views across access tiers**: when one presentation component (e.g. `MemberCompensationsView`) is rendered from routes with different `routeKey` guards (admin/manager `/members/$memberId/compensations` *and* member self-view `/my-compensations`), gate any cross-route navigation by an opt-in prop (default off). Never render a link whose destination is protected by a stricter guard than the current route — it ships members into a guaranteed access-denied page. The opting route turns it on; the lower-trust route leaves it off.

## Checklist

- [ ] `pnpm lint` and `pnpm test` pass
- [ ] Ternary for conditional rendering (not `&&`)
- [ ] Complex logic extracted to custom hooks
- [ ] Large routes (>200 LOC) decomposed
- [ ] Protected routes use `StudioRouteGuard` + shared access policy
- [ ] Consistent wrapper per route set
- [ ] Shared views rendered from multiple access tiers gate cross-route links by opt-in prop (default off)

## Related Skills

- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
- [table-view-pattern](../table-view-pattern/SKILL.md) — Table patterns
