---
name: astro-starlight-best-practices
description: Apply Astro and Starlight guardrails in eridu_docs for routes, rendering, auth, search, content, or assets.
---

# Astro + Starlight Best Practices

Use for `apps/eridu_docs` and other Astro/Starlight doc surfaces.

## Workflow

1. Classify: content/sidebar, route/endpoint, SSR/auth, search, UI override
2. Pick lowest-complexity rendering model
3. Align with Starlight defaults unless strong requirement to diverge
4. Verify with repo-standard commands

## Guardrails

### 1) Rendering Mode
Start static; use server rendering only for request-specific behavior. Explicitly prerender static routes in `output: 'server'`. Pagefind requires Starlight `prerender: true`.

### 2) Middleware
`src/middleware.ts` + `defineMiddleware()`. Store auth/user in `context.locals`. Keep public-path checks explicit.

### 3) Environment Variables
Server secrets are server-only. Only `PUBLIC_` prefix exposes to client. Use `astro:env` schema APIs for typed env.

### 4) Content Modeling
Astro content collections for docs. Schemas via `astro/zod`. Starlight docs in `src/content/docs/`; custom pages in `src/pages/`.

### 5) Sidebar
Use `autogenerate` for large directories. Frontmatter for per-page ordering/labels/badges. Function/workflow-first top-level groups — no genre buckets.

### 6) Search
Pagefind is default. Exclude via frontmatter `pagefind: false` or `data-pagefind-ignore`. Ensure Pagefind assets reachable with auth middleware.

### 7) Component Overrides
Prefer config/frontmatter/CSS first. Override via `starlight({ components: { ... } })`. Compose defaults when possible.

### 8) Hydration Budget
Default static. Use `client:visible` (below-fold), `client:idle` (medium), `client:load` (immediate) — lightest first.

### 9) Images
Use `astro:assets` (`<Image />`, `<Picture />`). `alt` mandatory. `public/` images are not optimized.

## Verification

```bash
pnpm --filter eridu_docs lint && pnpm --filter eridu_docs typecheck && pnpm --filter eridu_docs build
```

## References

- [references/official-guidance.md](references/official-guidance.md)
