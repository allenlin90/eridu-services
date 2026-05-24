# Creator Portal Foundation, Session Guards & Studio Switcher (Phases 1-3)

## Goal
Establish the architectural foundation, SSO session guard views, and active studio switcher context in the new Content Creator Portal (`erify_creators`). This enables content creators to securely access their dashboard, switch between active studio associations, and isolates their show assignments.

---

## Key Changes

### 1. Shared Contract Layer (`packages/api-types`)
* **Profile Schema (`src/users/schemas.ts`)**: Extended `profileResponseSchema` to return the linked `creator` profile object and nested active `studio_creators` roster associations.
* **Shows Search Schema (`src/shows/schemas.ts`)**: Added an optional `studio_id` query parameter string to `listShowsQuerySchema`.

### 2. Backend API Layer (`apps/erify_api`)
* **User & Profile Controllers (`src/me/profile/profile.controller.ts`, `src/models/user/user.service.ts`)**: Populated and mapped nested creator relations in the `/me` user profile query.
* **Show Assignment Filters (`src/me/shows/shows.service.ts`, `src/models/show/schemas/show.schema.ts`)**: Integrated the `studio_id` show query parameter, filtering assigned shows list by active studio context.
* **Testing**: Added Jest unit tests covering profile creator linkage and shows studio filtering.

### 3. Frontend Portal Layer (`apps/erify_creators`)
* **Session Guards (`src/routes/__root.tsx`, `src/lib/hooks/use-user.ts`)**: Created the `useUserProfile` query hook. Integrated onboarding session guards in the root route component layout.
* **Fallback Onboarding Views (`src/components/onboarding-guards.tsx`)**: Created premium fallback overlays (`UnlinkedCreatorView` and `NoStudioAssociationView`) with clean slate/indigo radial HSL glow gradients and glassmorphism styling to handle account exception states.
* **Active Studio Switcher (`src/lib/hooks/use-active-studio.ts`, `src/lib/hooks/use-creator-studios.ts`)**: Developed state context and TeamSwitcher adaptor hooks, persisting the selected studio in local storage (`lastActiveStudioId`) and handling query invalidation.
* **Sidebar Switcher Header (`src/config/sidebar-config.tsx`)**: Wired the generic `TeamSwitcher` in the sidebar header inside `useSidebarConfig`.
* **Shows List Filtering (`src/pages/shows/shows-list-page.tsx`)**: Connected the dynamic `activeStudioId` to the shows table query parameters.
* **Testing**: Added Vitest test suites covering hooks and onboarding components. Global test mocks updated in `src/test/setup.ts` to prevent provider regressions.

---

## Verification Plan

### Automated Tests
Verify all affected packages build and pass all test suites successfully:
```bash
# Shared package compilation
pnpm --filter @eridu/api-types build

# Backend compilation and Jest unit tests
DATABASE_URL="postgresql://admin:secret@localhost:5432/erify_api" pnpm --filter erify_api build
pnpm --filter erify_api test

# Frontend compilation and Vitest unit tests
pnpm --filter erify_creators build
pnpm --filter erify_creators lint
pnpm --filter erify_creators test
```

### Results
* **Frontend Tests**: 18 test files passed (93 tests total).
* **Backend Tests**: 113 Jest test suites passed (924 tests total).
* **Compilation**: Build succeeds with zero compile errors.
