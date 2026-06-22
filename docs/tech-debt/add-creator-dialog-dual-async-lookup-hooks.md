# Accepted: AddStudioCreatorDialog calls two async lookup hooks at the component level

**Status:** Accepted (low risk) · **Area:** `erify_studios` studio-creator-roster
**Origin:** PR #225 review (`pr-review.md` Frontend gate — async lookup field isolation)

## Context

`apps/erify_studios/src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx`
merges the former search-only "Add Creator" dialog and the standalone "Onboard
Creator" dialog into one component with a `mode: 'search' | 'create'` toggle.
The component calls two async lookup hooks unconditionally at the top level:

- `useCreatorCatalogQuery(...)` — backs the search-mode `AsyncCombobox`
- `useStudioCreatorOnboardingUsersQuery(...)` — backs the create-mode user-link
  `AsyncCombobox`, gated by `enabled: open && mode === 'create'`

`frontend-ui-components/SKILL.md` and the `pr-review.md` Frontend gate call for
"2+ async lookups → isolated `memo()` field components" so that typing in one
lookup doesn't re-render state owned by an unrelated lookup. This component
does not extract either lookup into an isolated `memo()` field — both hooks
and their derived `useMemo` option lists live in the parent component body.

## Why accepted (not refactored now)

- **Only one lookup is ever visibly active.** The two `AsyncCombobox` fields
  render in mutually exclusive `mode` branches (different `<form>` elements),
  never simultaneously, so the failure mode the rule guards against — one
  lookup's keystrokes re-rendering an unrelated *visible* lookup — cannot
  happen here.
- **Real but bounded cost.** The catalog query (`useCreatorCatalogQuery`) has
  no `mode === 'search'` gate, so it can refetch in the background while the
  user is in create mode (window refocus, cache invalidation elsewhere). This
  is wasted network/render work, not a correctness bug, and was already
  flagged as a non-blocking efficiency finding in the PR #225 code review.
- **Scope.** PR #225's own follow-up commits were scoped to two confirmed
  bugs raised in review (a mode-switch state-leak and a silently-filtered
  active-roster match); a structural extraction of both lookups into isolated
  `memo()` field components is a larger refactor than either fix and was not
  requested.

## When to revisit

Extract `CreatorCatalogPickerField` and `OnboardingUserLinkField` into
isolated `memo()` components (each owning its own hook + `useMemo` options)
if either becomes true:

- a third dialog mode is added (the component's local state/hook surface
  would otherwise grow linearly with mode count — see the "altitude" finding
  in the PR #225 review), or
- the catalog query's background refetch during create mode is shown to
  cause a real UX or rate-limit problem (currently just flagged as wasted
  work, not observed as user-impacting).
