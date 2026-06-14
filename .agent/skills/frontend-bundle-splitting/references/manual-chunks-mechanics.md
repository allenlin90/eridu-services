# `manualChunks` — official docs, mechanics, precedent

Reference for [frontend-bundle-splitting](../SKILL.md). Verify the approach against these primary sources before relying on it.

## Primary sources (verify here)

- **Rollup — `output.manualChunks`**: <https://rollupjs.org/configuration-options/#output-manualchunks>
- **Vite — `build.rollupOptions`** (forwarded to Rollup's output options): <https://vite.dev/config/build-options.html#build-rollupoptions>
- **Vite — Building for Production / Chunking Strategy**: <https://vite.dev/guide/build> (older stable: <https://v3.vitejs.dev/guide/build.html#chunking-strategy>)
- **Vite — `build.chunkSizeWarningLimit`** (default 500 kB; the source of the "Some chunks are larger than 500 kB" warning): <https://vite.dev/config/build-options.html#build-chunksizewarninglimit>
- **The footgun — vitejs/vite#12209 "Using manualChunks breaks code-splitting"**: <https://github.com/vitejs/vite/issues/12209>

> Vite passes `build.rollupOptions.output` straight to Rollup, so `manualChunks` is Rollup's option, configured through Vite. (Vite ≥ 2.9 stopped force-grouping vendors by default and shipped, then deprecated, a `splitVendorChunkPlugin` — manual control via `manualChunks` is the current path. Newer Vite on the Rolldown engine exposes equivalent options; the principles below are engine-agnostic.)

## How it works (per the Rollup docs)

- **Object form** — `{ 'vendor-react': ['react', 'react-dom'] }`: list module ids that seed a named chunk.
- **Function form** — `manualChunks(id, { getModuleInfo }) { ... }`: "each resolved module id will be passed to the function." Return a chunk name to place the module there, or `undefined`/nothing to leave it to Rollup's default algorithm. The `id` is the **resolved** module path (e.g. `…/node_modules/react-dom/index.js`), so match on path boundaries.
- **Dependency merging** — "By default, the function form will also merge dependencies of the returned ids into the manualChunk." So naming a package tends to pull its transitive deps along.
- **Side-effect warning** — "Be aware that manual chunks can change the behaviour of the application if side effects are triggered before the corresponding modules are actually used." Grouping can change *evaluation order/timing*; keep behavior-preserving and verify.
- **`getModuleInfo`** — lets the function inspect importers / whether a module is reached only from one entry, for smarter assignment (the docs' translated-strings example).

## Why a catch-all breaks code-splitting (the #12209 footgun)

`manualChunks` is consulted for **every** module in the graph — including ones reachable only through dynamic `import()`. If a catch-all (`return 'vendor'`) assigns a dynamically-imported, otherwise-lazy library (charts, a calendar, a rich editor) to a chunk that is also referenced eagerly, that whole chunk becomes part of eager load — the dynamic boundary is lost. The fix is to be **selective**: name only the chunks you want, and `return undefined` for everything else so Rollup keeps its automatic (lazy-preserving) split. This is the documented behavior behind vitejs/vite#12209.

Corollary: assigning a module to a manual chunk **cannot make an eager module lazy** — it only chooses the file. If the module is reachable from the startup graph, its chunk loads at startup regardless. To defer it, change the *import* (lazy `import()` / narrower import), not the chunking.

## Well-known precedent / React best practice

- **Route-based code-splitting is the first lever** — React's own guidance is `React.lazy` + `Suspense` at route boundaries (<https://react.dev/reference/react/lazy>); routers automate it (e.g. TanStack Router's `autoCodeSplitting`, React Router lazy routes). Confirm this is in place *before* manual vendor chunking.
- **The `react-vendor` split** — separating `react`/`react-dom`/router into a long-cached vendor chunk, utilities (date-fns/axios) into another, and heavy libs (charts) into their own, is the widely-recommended community pattern for Vite + React (e.g. soledad penadés, *"Use manual chunks with Vite to facilitate dependency caching"*: <https://soledadpenades.com/posts/2025/use-manual-chunks-with-vite-to-facilitate-dependency-caching/>). The win is caching: a vendor chunk's content hash is stable across app-code deploys, so returning users skip re-downloading it.

## Worked case study (illustrative — not a spec)

`apps/erify_studios` shipped a **single 1.16 MB eager entry** (gzip 350 kB) with no `manualChunks`, while route-splitting was already on and the heaviest libs (charts, calendar) were already lazy.

- Extracting `vendor-react` + `vendor-tanstack` + `vendor-forms` cut the eager entry to **gzip 207 kB (−41%)** and made 478 kB of stable vendor independently cacheable. Charts/calendar **stayed lazy** because the function returned `undefined` for them (rule 3).
- A first attempt grouped **all** `@tanstack/*` together — but `react-query`/`react-router` are startup-eager while `react-table`/`react-virtual` are table-screen-only, so non-table pages paid for table code (rule 4). Splitting table/virtual into their own `vendor-table` chunk fixed the startup chunk.
- Trying to *exclude* table instead **grew the entry**: `react-table` is reachable from the startup graph via the shared UI's data-table, so it merged into the entry rather than a route chunk (rule 5). Chunking could only isolate it; making tables lazy needs decoupling that eager import path — a separate follow-up.

The numbers and package names above are a point-in-time illustration; the **rules** in the skill are the durable part.
