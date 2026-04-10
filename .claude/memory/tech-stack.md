# Tech Stack Details

## erify_api (NestJS Backend)

### Core
- NestJS 11.1.12
- Prisma 7.0.0 (ORM)
- PostgreSQL (via pg 8.14.1)

### Validation & API
- nestjs-zod 5.1.1 (Zod integration)
- @nestjs/swagger + @scalar/nestjs-api-reference (OpenAPI)

### Auth & Security
- @eridu/auth-sdk (JWT/JWKS validation)
- jose 6.0.11 (JWT crypto)
- helmet (security headers)
- @nestjs/throttler (rate limiting)

### Logging
- nestjs-pino + pino-pretty

### Testing
- Jest 29.7.0
- Supertest (E2E)

### Module Structure
```
/src
  /admin - Admin endpoints
  /backdoor - Testing endpoints (API key protected)
  /common - Shared enums
  /config - Environment validation
  /lib - Auth guards, filters, pagination
  /models - Domain models (User, Studio, Show, Task, etc.)
  /studios - Studio-scoped controllers
  /task-orchestration - Bulk task operations
  /show-orchestration - Show workflows
  /schedule-planning - Schedule generation
```

---

## eridu_auth (Better Auth Service)

### Core
- Hono 4.7.6 (web framework)
- Better Auth 1.4.17
- Drizzle ORM 0.41.0
- PostgreSQL (via pg 8.14.1)

### Frontend (Auth UI)
- React 19.2.0
- Vite 7.2.4
- TanStack Router 1.139.3
- @eridu/ui package

### Auth Features
- Email/password + verification
- Magic links (configured)
- JWT tokens (15min expiration)
- Multi-session support
- Organizations & Teams
- Admin plugin
- API key management
- SSO ready (SAML/OIDC disabled Phase 1)

### Configuration
- Base path: `/api/auth`
- Cookie prefix: `eridu_auth`
- Cross-subdomain cookies enabled
- JWT payload: id, name, email, image, org/team IDs

---

## erify_creators & erify_studios (React Apps)

### Core
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- Node >= 22

### Routing & State
- TanStack Router 1.139.3 (file-based)
- TanStack Query 5.90.11 (server state)
- idb-keyval 6.2.2 (query cache persistence)

### UI & Styling
- Tailwind CSS 4.1.17 (@tailwindcss/vite)
- @eridu/ui (Radix UI components)

### API & Auth
- Axios 1.13.2
- @eridu/auth-sdk (Better Auth client)
- @eridu/api-types (Zod schemas)

### i18n
- Paraglide JS 2.0.0
- @eridu/i18n package
- Build-time compilation

### Testing
- Vitest 4.0.13
- Happy DOM 20.0.11
- Testing Library React 16.3.0
- Coverage: V8 provider

### Additional (erify_studios)
- @dnd-kit/core, @dnd-kit/sortable (drag-drop)
- @tanstack/react-virtual (virtualization)
- react-hook-form 7.68.0
- sonner 2.0.7 (toasts)
- usehooks-ts 3.1.1
- PWA shell via `vite-plugin-pwa`; Workbox SPA navigation fallback should bind to `/` rather than `index.html` on hosts that canonicalize `index.html`
- Runtime update policy is `prompt`-based so non-iOS browsers can auto-apply while iOS keeps updates pending until explicitly applied

### Browser Upload Notes
- `@eridu/browser-upload` is worker-first (`Web Worker` + `OffscreenCanvas`) with main-thread `canvas` fallback and `HTMLImageElement` decode fallback for Safari/iPhone.
- Image compression now probes real WebP encoder support before trying `image/webp`, keeps the original file as the size baseline, and returns `metTarget` so callers can block oversize best-effort results without showing a false success toast.

### Feature Organization
```
/src
  /components - Shared components
  /config - App configuration
  /features - Domain features
  /i18n - App translations
  /layouts - Layout components
  /lib - API client, auth, hooks, utils
  /pages - Page components
  /routes - TanStack Router routes
  /test - Test setup
```

---

## Shared Packages

### @eridu/api-types
- Zod schemas for API contracts
- Snake_case for JSON compatibility
- Subpath exports per domain
- Constants and enums
- Type inference from schemas

### @eridu/auth-sdk
- Server: JWT/JWKS verification
- Client: React hooks for Better Auth
- Adapters: NestJS guards and decorators
- JWKS caching + auto-rotation
- Token refresh logic

### @eridu/ui
- Radix UI primitives
- Tailwind CSS styling
- class-variance-authority (variants)
- Components: Button, Dialog, Form, Table, DatePicker, AsyncCombobox, Sidebar
- Hooks: useDebounce, useTableUrlState

### @eridu/i18n
- Paraglide JS (compile-time i18n)
- Generated type-safe functions
- LocaleEnum, LOCALE_LABELS
- Watch mode for dev

### @eridu/browser-upload
- Shared browser-side file preparation for direct R2 uploads
- Worker-first image compression via `Web Worker` + `OffscreenCanvas`
- Main-thread canvas fallback with `HTMLImageElement` decode fallback for Safari/iPhone `createImageBitmap` gaps

---

## Build & Dev Tools

### Monorepo
- Turborepo 2.7.5
- pnpm 10.28.0
- pnpm workspaces

### Linting & Formatting
- ESLint (shared config: @eridu/eslint-config)
- TypeScript (shared config: @eridu/typescript-config)

### Git Hooks
- Husky 9.1.7
- commitlint (Conventional Commits)
- Pre-commit: ESLint + Sherif

### Utilities
- Sherif - Dependency version alignment
- cross-env - Cross-platform env vars
- dotenv - Environment variables
