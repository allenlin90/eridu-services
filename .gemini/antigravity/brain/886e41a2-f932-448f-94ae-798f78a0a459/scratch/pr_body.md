This Pull Request establishes the **Creator Portal Foundation, Guard UX & Active Studio Switcher** (Phases 1, 2, & 3) in the `erify_creators` portal matching the visual design, quality standards, and three-layer architecture of `erify_studios`.

### 🛠️ What Changed?

1. **Contract & Backend Parity (Phase 1)**:
   - **Shared Schema Extensions (`@eridu/api-types`)**: Exposes the `creator` object, alias details, and active `studio_creators` roster memberships in the `/me` user profile response schema. Added an optional `studio_id` string filter to `/me/shows`.
   - **Backend API (`erify_api`)**: Populated and mapped nested creator relations in NestJS services (`user.service.ts`), controllers (`profile.controller.ts`), and Prisma schemas. Integrated robust `studio_id` show filtering in `shows.service.ts` so creators can isolate their shows by active studio context. Added 3 comprehensive backend Jest unit tests.

2. **Session Guards & Onboarding Fallbacks (Phase 2)**:
   - **Profile & Active Roster Guards (`erify_creators`)**: Root layout guards protect the creator workspace using our custom `useUserProfile` React Query hook querying `/me`.
   - **Premium Onboarding Fallback Views**: Designed and implemented gorgeous, premium-themed full-page layouts featuring slate/indigo HSL glow gradients, glassmorphism panels, and elegant transitions:
     - `UnlinkedCreatorView`: Greets users with no connected Creator database profile.
     - `NoStudioAssociationView`: Greets creators with no active studio membership roster.
   - **State Control Actions**: Allows users to dynamically recheck roster status (leveraging TanStack Query `refetch`) or cleanly sign out (purging memory, IndexedDB persister caches, and JWT tokens).
   - **Thorough Unit Testing**: Added robust React Testing Library + Vitest unit test suites covering the custom hooks and onboarding view components.

3. **Active Studio context Selector (Phase 3)**:
   - **`useActiveStudio` Hook**: Reads the selected studio from `localStorage` (`lastActiveStudioId`), defaulting to the first active studio from the creator roster. Handles cache invalidation for the `['me', 'shows']` scope on switcher toggle.
   - **`useCreatorStudios` Switcher Adaptor**: Maps creator studio roster entries to `TeamSwitcher`-compatible objects (displaying active roster status).
   - **`TeamSwitcher` Dropdown Header Integration**: Integrated the shared `@eridu/ui` `TeamSwitcher` in the sidebar header inside `useSidebarConfig`, allowing seamless active context switching for creators working across multiple studios.
   - **Shows Studio-filtering Integration**: Wired the active `studio_id` directly to the `useMyShows` query parameters inside the `ShowsListPage` component so the list dynamically filters based on the selected studio switcher context.
   - **Comprehensive Hook Unit Testing**: Added 3 new Vitest unit test suites covering both `useActiveStudio` storage/invalidation mechanics and `useCreatorStudios` adaptor mappings.

---

### 🧪 Verification Outcomes

- **All 18 Frontend Test Files** passed successfully (93 tests total).
- **All 113 Backend Jest Test Suites** passed successfully (924 tests total).
- **Paraglide i18n & Vite Client Builds** compile cleanly with zero errors/warnings.
