---
name: frontend-tech-stack
description: Provides standards for the frontend application technology stack. This skill should be used when setting up new frontend projects or upgrading existing ones with React 19, Vite, and Tailwind v4.
---

# Frontend Tech Stack

Standard technology stack for all frontend applications.

## Core Technologies

| Category | Technology | Version |
|---|---|---|
| Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Routing | TanStack Router | 1.x |
| State/Query | TanStack Query | 5.x |
| I18n | Paraglide JS | 2.x |

## Project Structure

```
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

## Checklist

- [ ] Vite + React + TypeScript
- [ ] Tailwind CSS v4 plugin
- [ ] TanStack Router for navigation
- [ ] Workspace packages (`@eridu/ui`, `@eridu/api-types`)

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — UI component patterns
