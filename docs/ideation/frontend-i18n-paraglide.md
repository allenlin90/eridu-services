# Ideation: Full Frontend i18n Standardization

> **Status**: Deferred from initial frontend rollout
> **Origin**: i18n Tech Debt Audit (2026-03-17)
> **Related**: [frontend-i18n skill](../../.agent/skills/frontend-i18n/SKILL.md), [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

## What

Standardize and implement full internationalization across all frontend applications (`erify_creators`, `erify_studios`, `eridu_auth`) using Paraglide JS and the shared `@eridu/i18n` package. This involves extracting all hard-coded user-facing strings into message files and ensuring type-safe usage via Paraglide's generated runtime.

## Why It Was Considered

- **Multi-region Support**: Preparation for non-English speaking markets (e.g., Thailand, Greater China).
- **Consistent UI Terminology**: Centralizing common terms (Save, Cancel, Status labels) in `@eridu/i18n` ensures a unified user experience.
- **Developer Productivity**: Paraglide provides type-safe message keys, preventing runtime errors and making refactoring easier.
- **Maintainability**: Clear separation of content from presentation logic.

## Why It Was Deferred

1. **Initial Velocity**: Fast-tracking the initial release by using English strings directly in components.
2. **Setup Overhead**: While the infrastructure exists, full extraction requires a dedicated sweep of all features.
3. **Translation Workflow**: Lack of a formal process for keeping Thai (`th.json`) and Traditional Chinese (`zh-TW.json`) in sync with English.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **New Market Entry**: Official requirement to support a non-English locale in production.
2. **UI Audit Phase**: A dedicated "Polish & Quality" phase is scheduled to address technical debt.
3. **Component Refactor**: Any major refactor of core components (Layouts, Forms) should include i18n extraction as a requirement.

## Implementation Notes (Preserved Context)

### Hard-coded Debt Examples
Research identified numerous instances of hard-coded strings, particularly in labels and headers:
- `apps/erify_creators/src/layouts/sidebar-layout-header.tsx`: "Erify Creators"
- `apps/erify_creators/src/pages/not-found-page.tsx`: "Go Home"
- `apps/erify_studios/src/features/schedules/components/schedule-dialogs.tsx`: "Draft", "Review", "Published"
- `apps/erify_studios/src/features/creators/components/creator-dialogs.tsx`: "Active", "Banned"
- `apps/eridu_auth/src/frontend/features/portal/components/user-update-form.tsx`: "Name", "Email", "Role"

### Technical Workflow
1. **Shared First**: Check `packages/i18n/messages/en.json` for generic terms (e.g., `common.save`, `table.startTime`).
2. **App-Specific**: For feature-specific strings, add to `apps/[app]/src/i18n/messages/en.json`.
3. **Paraglide Runtime**: Use `import * as m from '@/paraglide/messages'` for app messages and `import * as sharedM from '@eridu/i18n'` for shared ones.
4. **Dynamic Content**: Use Paraglide's parameter support `{param}` for messages with variables (e.g., `Welcome, {name}`).

### Verification Items
- [ ] Run `pnpm --filter @eridu/i18n build` to generate shared types.
- [ ] Run `pnpm dev` in the target app to trigger Paraglide code generation.
- [ ] Verify no hard-coded strings remain in the component.
- [ ] Test language switching via `LocaleEnum` from `@eridu/i18n`.
