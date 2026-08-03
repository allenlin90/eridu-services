---
name: frontend-tech-stack
description: Apply repo standards for React 19, Vite, and Tailwind v4 when creating or upgrading a frontend workspace.
---

# Frontend Tech Stack

Procedure for creating or upgrading a frontend workspace. Canonical stack table, project structure, principles, and configuration rules live in [`knowledge/engineering/frontend-tech-stack`](../../../knowledge/engineering/frontend-tech-stack.md).

## Procedure

1. Check the target workspace against the knowledge doc's stack table (React 19, Vite 7, Tailwind v4, TanStack Router/Query, Paraglide).
2. Match the documented `src/` structure — `routes/` for composition, `features/<name>/` self-contained, shared code only when more than one feature uses it.
3. Wire Vite with `@tailwindcss/vite` + `@tanstack/router-plugin/vite` + `@vitejs/plugin-react`. Tailwind v4 config is CSS-first in `index.css`.
4. If a shared package exports a stylesheet from `dist/`, confirm its `@source` glob covers emitted `.js` as well as source TypeScript — otherwise consumer builds silently drop its utility classes.
5. Any `package.json` change updates `pnpm-lock.yaml` in the same change set.
6. Bundle/chunking work goes through [`frontend-bundle-splitting`](../frontend-bundle-splitting/SKILL.md); do not hand-edit `manualChunks` from this skill.

## Verification

```bash
pnpm --filter <workspace> lint && pnpm --filter <workspace> typecheck && pnpm --filter <workspace> test && pnpm --filter <workspace> build
```

`build` is mandatory here — Vite applies stricter checks than `typecheck`. For dependency changes also run `pnpm install`, `pnpm lint`, and `pnpm sherif`.

## Canonical Knowledge

- [`knowledge/engineering/frontend-tech-stack`](../../../knowledge/engineering/frontend-tech-stack.md) — stack, structure, principles, configuration
- [`frontend-code-quality`](../code-quality/references/frontend-code-quality.md) | [`frontend-ui-components`](../frontend-ui-components/SKILL.md)
