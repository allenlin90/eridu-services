# Shared `Badge` component missing `success`/`warning` variants

**Area**: `@eridu/ui`'s `Badge` (`packages/ui/src/components/ui/badge.tsx`)

## Current behavior

`badgeVariants` (CVA) only defines `default` / `secondary` / `destructive` / `outline`. Several call sites pass `variant="success"` or `variant="warning"` anyway (e.g. `apps/erify_studios/src/features/client-mechanics/config/mechanic-columns.tsx:81`, the "Active" status badge). Since `success`/`warning` aren't keys in `variants.variant`, CVA emits none of the variant classes for that badge — it renders with only the base (untinted) classes, not a TypeScript error, so the gap survives `tsc` and code review until someone looks at the rendered page.

PR 20.6's coverage page (`apps/erify_studios/src/routes/studios/$studioId/client-mechanics/$mechanicId.coverage.tsx`) hit this at typecheck time (`tsc -b tsconfig.app.json --noEmit`, the project's real invocation per `erify-studios-typecheck-noop.md`) and worked around it locally with `variant="outline"` + explicit `border-emerald-200 bg-emerald-50 text-emerald-700` / amber equivalents, rather than fixing the shared component.

## Desired behavior

Either:
- Add `success` / `warning` keys to `badgeVariants` in the shared `Badge` component (one definition, reused everywhere), or
- Standardize on the `variant="outline"` + explicit Tailwind classes pattern used in the 20.6 coverage page and apply it at the one remaining stale call site.

## Risk

Low — purely cosmetic (the badge still renders, just without the intended color), and `tsc -b tsconfig.app.json --noEmit` already catches *new* misuse (as it did in 20.6); only the one pre-existing call site in `mechanic-columns.tsx` is silently wrong today.

## Trigger to fix

Touching `mechanic-columns.tsx`'s Active/Retired badges again, a `@eridu/ui` Badge component change, or a second new call site hitting the same typecheck error.
