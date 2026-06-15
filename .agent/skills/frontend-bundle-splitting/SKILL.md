---
name: frontend-bundle-splitting
description: How to split a large eager JS bundle into cacheable vendor chunks with Vite/Rollup manualChunks — when one big entry/vendor chunk dominates first load. Use when reducing bundle size, configuring build.rollupOptions.output.manualChunks, or deciding what to code-split vs vendor-chunk in a Vite + React app. Generic guidance, grounded in the official Vite & Rollup docs.
---

# Frontend Bundle Splitting (Vite / Rollup `manualChunks`)

Two different mechanisms shrink first load — don't confuse them:

- **Code-splitting (lazy)** — `import()` / `React.lazy` / router auto-splitting. Defers code until a route/interaction needs it. *Reduces bytes downloaded on first paint.*
- **Vendor chunking (`manualChunks`)** — groups *eagerly-loaded* dependencies into separate files. Mostly a **caching + parallel-download** win (stable vendor files survive app-code deploys); it does **not** by itself defer eager code.

Reach for `manualChunks` when the build emits **one large eager entry/vendor chunk** (the "Some chunks are larger than 500 kB" warning). Reach for lazy `import()` when heavy code is only needed conditionally. See [references/manual-chunks-mechanics.md](references/manual-chunks-mechanics.md) for the official Vite/Rollup docs, how it works internally, and well-known precedent.

## Decision rules

1. **Diagnose before splitting.** Read the build's chunk map first. Identify whether route-splitting is already on (e.g. TanStack/React Router auto-split) and what's *already lazy*. Don't "add lazy loading" to something already split — fix what the map actually shows.
2. **Only manual-chunk stable, eagerly-loaded vendors.** Grouping `react`/`react-dom`, the router/query runtime, and form/validation libs into named chunks (e.g. `vendor-react`) is a caching win: their hashes don't change when app code does. Volatile app code does not belong in a hand-named vendor chunk.
3. **Never write a catch-all `return 'vendor'`.** `manualChunks` runs for **every** module, including dynamically-imported ones. A catch-all yanks already-lazy heavy libs (charts, calendars, editors) **into an eager chunk** — silently undoing code-splitting. Return `undefined` for everything you don't explicitly want grouped, so the bundler keeps its default (lazy) chunking. This is a documented footgun (vitejs/vite#12209).
4. **Group by *load timing*, not by org/namespace prefix.** A scope like `@tanstack/*` mixes startup-eager packages (query, router) with route-scoped ones (table, virtual list). Lumping the whole prefix into one eager chunk makes every page pay for table code. Split the eager subset from the route-scoped subset (or give each its own chunk).
5. **`manualChunks` can only *isolate* an eager module — it cannot make it lazy.** If a heavy lib is reachable from the startup graph (e.g. a UI barrel re-exports a data-table that pulls it in), excluding it from a manual chunk just relocates it into the entry. Truly deferring it requires breaking the eager import path (lazy `import()` at the call site, or a narrower import) — a separate change. Chunking decides *which* file eager code lives in, not *whether* it's eager.
6. **Verify by measuring, behavior-preserving.** Compare the chunk map before/after; confirm the eager entry shrank and that previously-lazy chunks are still separate. The app must build and behave identically — `manualChunks` is output-only config. Don't chase the warning into app code speculatively; stop when the remaining entry is app shell, and hand the rest to lazy-loading / component decomposition.

## Split in the consumer, not the shared library

**Lazy-loading is a consumer (app bundling) decision — keep shared packages (`@eridu/ui`, etc.) generic and synchronous.** Don't bake `React.lazy`/`Suspense` into a shared component to defer a heavy sub-dependency (e.g. wrapping `@eridu/ui`'s calendar so `DatePicker` defers react-day-picker): it forces a bundling/UX strategy on *every* consumer and couples the library to one app's perf goals. The library exports plain components (and may expose a heavy part via a **subpath export** so a consumer *can* lazy-import it); each app decides what to code-split.

When a heavy dep (e.g. react-day-picker via `DatePicker`) is eager, fix it **consumer-side**: identify the eager import site and either (a) ensure that route/section is code-split so the dep rides into a route chunk, or (b) lazy-load the component at that site with an app-level wrapper. Don't reach into the dependency.

**Concern — sometimes there is no clean consumer-side deferral.** When a heavy dep is pulled by a *widely-shared* library component used across many route chunks (e.g. react-day-picker via `@eridu/ui`'s `DatePicker`, used by 18+ routes; same shape for the `vaul` drawer and `react-table`), the bundler **hoists it to a sync-eager position**. Consumer `manualChunks` can then only **isolate** it (a caching win — the eager entry shrinks but the chunk is still preloaded, so net first-load is ~unchanged), **not defer** it (see rule 5). Truly deferring it needs the *library* to expose a lazy-friendly seam (a subpath export or a slot/render-prop the consumer opts into) — **not** `React.lazy` baked into the component. Until that seam exists, isolate-for-caching at most and move on; don't force a deferral that violates the generic-library principle. (Verified empirically on `erify_studios`: extracting `vendor-daypicker` kept it preloaded.)

## Keep it generic

Match on path boundaries (`id.includes('/node_modules/<pkg>/')`), not version strings. Group a *small* set of clearly-justified, stable vendors — adding a chunk per package is over-engineering. The pattern is the guidance; the exact package list is a per-app detail that changes as deps change.

## Related

- [frontend-performance](../frontend-performance/SKILL.md) — broader perf rules (memoization, virtual scroll, lazy heavy components).
- [references/manual-chunks-mechanics.md](references/manual-chunks-mechanics.md) — official docs, mechanics, precedent, and a worked case study.
- [codebase-hardening-program](../codebase-hardening-program/SKILL.md) — running a behavior-preserving perf/quality pass as one-PR-per-item.
