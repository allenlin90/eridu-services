# Accepted: route-navigation search defaults are hardcoded per call site, not derived from the schema

**Status:** Accepted (low priority) · **Area:** `erify_studios` route search-param contracts
**Origin:** PR #257 review discussion (typecheck-noop triage)

## Context

`apps/erify_studios/src/routes/**` has ~10 list-owning routes whose `validateSearch`
schema declares pagination with a required-output default, e.g.:

```ts
page: z.coerce.number().int().min(1).catch(1),
limit: z.coerce.number().int().min(1).catch(10),
```

Because the schema output is non-optional, every `<Link>`/`navigate()` targeting
that route (or a route nested under it) must supply a `search` object matching
the full shape — TanStack Router won't apply the schema's own default for a
write. PR #257 fixed ~35 call sites across the app that were missing this
(the root cause of most of the 386 typecheck errors it triaged), each supplying
the matching literal by hand, e.g. `search={{ page: 1, limit: 10 }}`.

The alternative considered: export a derived default next to each schema —
`export const showsListDefaultSearch = studioShowsSearchSchema.parse({})` —
and have call sites import it instead of retyping the literal. This can never
drift from the schema, since it's computed from it.

## Why accepted (not refactored now)

- **No observed drift.** Checked the full history of `shows.tsx`'s search
  schema (and by extension the pattern generally): no commit has ever changed
  an existing `.catch(...)` default value, only added new fields. The failure
  mode this would guard against — a schema default changing while hardcoded
  Links silently keep the stale value — has zero track record in this app.
- **Current state is correct and verified.** All ~35 call sites were checked
  for internal consistency during the PR #257 triage; none currently diverge
  from their target route's actual default.
- **Real, immediate cost vs. a hypothetical, unobserved one.** Doing this now
  means re-touching ~35 already-correct, test-verified files across unrelated
  features purely to harden against a scenario that hasn't happened here. See
  `verify-real-scenario-before-hardening` — don't build the guard before the
  failure is reachable.

## When to revisit

Extract the derived-default pattern (`schema.parse({})` exported next to the
schema) for a given route if either becomes true:

- someone actually changes that route's pagination/list default and has to
  hunt down every Link that hardcodes the old value to keep behavior
  consistent — do it then, scoped to that one route, not preemptively for all
  of them, or
- a new route search schema is being designed and the author wants the
  convention from the start (cheap to add up front, unlike retrofitting).

Do not treat this as a backlog item to batch-fix across the app — the fix is
worth exactly what a single future incident costs, not more.
