---
name: astro-starlight-best-practices
description: Best-practice guardrails for Astro + Starlight docs apps in this repo. Use when building or changing eridu_docs routes, rendering mode, middleware/auth flows, search behavior, content structure, component overrides, or asset/env handling.
---

# Astro + Starlight Best Practices

Use this skill for `apps/eridu_docs` and other Astro/Starlight doc surfaces.

## Workflow

1. Classify the change:
   - docs content + sidebar
   - Astro route/endpoint
   - SSR/auth middleware behavior
   - search/index behavior
   - Starlight UI override
2. Pick the lowest-complexity rendering model that satisfies requirements.
3. Keep content/schema/search decisions aligned with Starlight defaults unless there is a strong requirement to diverge.
4. Verify the app with repo-standard commands before finalizing.

## Guardrails

### 1) Rendering mode and prerender

- Start static by default; only use server rendering when request-specific behavior is required.
- In `output: 'server'`, explicitly prerender routes that should stay static.
- In Starlight, `pagefind` cannot be enabled if Starlight `prerender` is `false`.

### 2) Middleware and request-scoped state

- Use `src/middleware.ts` + `defineMiddleware()` for request interception.
- Store request-scoped auth/user state in `context.locals` and read it in pages/endpoints/components.
- Keep public-path checks explicit (`/_astro`, static assets, auth callbacks, search assets).

### 3) Environment variables and secrets

- Treat server secrets as server-only variables.
- Only expose variables prefixed with `PUBLIC_` to client code.
- Do not rely on `.env` inside `astro.config.*`; define config carefully for build/runtime contexts.
- Prefer typed env declarations; for advanced env typing, use Astro’s `astro:env` schema APIs.

### 4) Content modeling

- Use Astro content collections for docs and structured content.
- Define schemas with `astro/zod` and validate frontmatter/data at the collection boundary.
- Keep Starlight docs content in `src/content/docs/`; use `src/pages/` for custom non-collection pages.

### 5) Starlight sidebar and frontmatter

- Use `starlight.sidebar` for intentional nav structure.
- Prefer `autogenerate` groups for large directories; use frontmatter `sidebar` fields for per-page ordering/labels/badges.
- Use page frontmatter intentionally:
  - `template: splash` for landing-style pages
  - `draft: true` for dev-only content
  - `pagefind: false` for excluded pages

### 6) Search behavior

- Default Starlight search is Pagefind; build + deploy is enough to enable it.
- Exclude sensitive/non-indexable pages via frontmatter `pagefind: false`.
- Exclude page fragments via `data-pagefind-ignore`.
- If auth middleware is enabled, ensure Pagefind client assets remain reachable.

### 7) Component overrides

- Prefer config/frontmatter/CSS customization first.
- Override Starlight components only when behavior or markup must change.
- Register overrides in `starlight({ components: { ... } })`.
- Compose default components (`@astrojs/starlight/components/...`) when possible instead of full replacement.

### 8) JS and hydration budget

- Keep Astro pages static by default.
- Use the lightest client directive that meets UX needs:
  - `client:visible` for below-the-fold/expensive widgets
  - `client:idle` for medium-priority widgets
  - `client:load` only for immediately interactive UI

### 9) Images and accessibility

- Prefer `astro:assets` (`<Image />`, `<Picture />`) for image processing and layout stability.
- `alt` is mandatory for `Image`/`Picture`.
- Remember `public/` images are not optimized.

## Verification

Run for `eridu_docs` after changes:

```bash
pnpm --filter eridu_docs lint
pnpm --filter eridu_docs typecheck
pnpm --filter eridu_docs test
pnpm --filter eridu_docs build
```

## References

For source-backed details and links, read:

- `references/official-guidance.md`
