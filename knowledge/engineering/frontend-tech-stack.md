---
type: engineering_standard
title: Frontend Tech Stack
description: Standard technology stack, project structure, and configuration for eridu-services frontend applications.
status: stable
stale_after: "2027-01-01"
sources:
  - title: erify_studios workspace manifest
    path: apps/erify_studios/package.json
  - title: erify_studios Vite configuration
    path: apps/erify_studios/vite.config.ts
---

# Frontend Tech Stack

Standard technology stack for all frontend applications. Selected by the [`frontend-tech-stack`](../../.agents/skills/frontend-tech-stack/SKILL.md) skill.

## Core Technologies

| Category | Technology | Version |
| --- | --- | --- |
| Framework | React | 19.x (`react@^19.2.0`) |
| Build Tool | Vite | 7.x (`vite@^7.3.6`) |
| Styling | Tailwind CSS | 4.x (`@tailwindcss/vite`) |
| Routing | TanStack Router | 1.x |
| State/Query | TanStack Query | 5.x |
| I18n | Paraglide JS | 2.x (`@eridu/i18n`) |
| UI Components | `@eridu/ui` | Radix primitives + Tailwind v4 |

## Project Structure

```text
src/
├── routes/             # TanStack Router file-based routes
├── features/           # Feature-based modules (self-contained)
│   └── awesome-feature/
│       ├── api/        # API calls
│       ├── components/ # Feature-only components
│       ├── hooks/      # Feature hooks
│       └── types/      # Feature types
├── components/         # Shared components (cross-feature)
├── hooks/              # Shared hooks (cross-feature)
├── lib/                # Utilities and API clients
└── stores/             # Global state stores
```

## Key Principles

1. **Colocation**: Keep related code in the feature that uses it
2. **No Cross-Feature Imports**: Compose features at route/app level
3. **Shared Code**: Only code used by multiple features goes in global folders
4. **Route Composition**: Keep route files as composition boundaries, not monoliths

## Configuration

**Vite**: `@tailwindcss/vite` + `@tanstack/router-plugin/vite` + `@vitejs/plugin-react`

**Tailwind v4**: CSS-first config in `index.css` using `@import "tailwindcss"` + `@theme { ... }`

When a shared package exports its Tailwind stylesheet from `dist/`, its `@source`
glob must include emitted JavaScript (`.js`) as well as source TypeScript. Otherwise
consumer builds omit the package's utility classes even though its theme tokens load.

**Vendor chunking**: `erify_studios` splits production output through a custom Rollup `manualChunks` function in `vite.config.ts` (`vendor-react`, `vendor-tanstack`, `vendor-table`, `vendor-forms`). Treat that split as the reference implementation, not as a requirement every workspace has already adopted — see [`frontend-bundle-splitting`](../../.agents/skills/frontend-bundle-splitting/SKILL.md) before changing it.

## Checklist

- [ ] Vite + React + TypeScript
- [ ] Tailwind CSS v4 plugin
- [ ] TanStack Router for navigation
- [ ] Workspace packages (`@eridu/ui`, `@eridu/api-types`)

## Related Concepts

- [`engineering/pwa-best-practices`](pwa-best-practices.md) — Service worker and offline behavior
- [`engineering/table-view-pattern`](table-view-pattern.md) — Table and list surfaces
- [`code-quality § frontend quality`](../../.agents/skills/code-quality/references/frontend-code-quality.md) — Quality standards
- [`frontend-ui-components`](../../.agents/skills/frontend-ui-components/SKILL.md) — UI component patterns
