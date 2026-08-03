---
name: frontend-tech-stack
description: Apply repo standards for React 19, Vite, and Tailwind v4 when creating or upgrading a frontend workspace.
---

# Frontend Tech Stack Procedure

Thin procedural skill for applying frontend technology standards. Factual stack standards are owned by [`knowledge/engineering/frontend-tech-stack.md`](../../../knowledge/engineering/frontend-tech-stack.md).

## Task Workflow

1. **Verify Stack**: Check target app dependencies against [`knowledge/engineering/frontend-tech-stack.md`](../../../knowledge/engineering/frontend-tech-stack.md) (React 19, Vite 7, Tailwind v4, TanStack Router, TanStack Query, Paraglide i18n).
2. **Setup Routing & Assets**: Ensure `@tanstack/router-plugin/vite` auto code-splitting is enabled.
3. **Configure Chunk Splitting**: Inspect `vite.config.ts` for custom Rollup `manualChunks` (`vendor-react`, `vendor-tanstack`, `vendor-table`, `vendor-forms`).
4. **Verification**: Run `pnpm --filter <workspace> typecheck` and `pnpm --filter <workspace> build`.

## Canonical Knowledge Reference

- [`knowledge/engineering/frontend-tech-stack.md`](../../../knowledge/engineering/frontend-tech-stack.md)
