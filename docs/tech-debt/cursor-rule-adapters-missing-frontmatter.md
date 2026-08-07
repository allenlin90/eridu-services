# Cursor rule adapters have no frontmatter, so they may never auto-attach

## Affected surface

`.cursor/rules/erify_api_guide.mdc` and
`.cursor/rules/monorepo_packages_guide.mdc`.

## Current behavior

Both files are plain Markdown with no `.mdc` frontmatter block. Cursor uses
frontmatter (`description`, `globs`, `alwaysApply`) to decide when a rule is
attached to a request. Without it, neither adapter is auto-applied by path, so
a Cursor agent working under `apps/erify_api/` or `packages/*` may never see the
routing instruction that sends it to `AGENTS.md` and the canonical skills.

`.agents/rules/03-monorepo-packages.mdc` already carries
`description` + `globs` and demonstrates the intended shape.

## Desired behavior

Add the frontmatter each adapter needs so Cursor attaches it on the paths it
governs — `apps/erify_api/**/*` for the backend adapter, and
`packages/**/*, apps/**/*` for the monorepo-package adapter — matching the
glob conventions already used in `.agents/rules/`. Verify in Cursor that the
rule actually attaches rather than assuming the frontmatter is sufficient.

## Risk

Low correctness risk (nothing else depends on these files) but it silently
defeats the purpose of the adapters: the routing exists in the repository but
never reaches the agent, so a Cursor session falls back to whatever it infers
instead of the canonical rules. The gap predates the thin-adapter conversion —
the previous 450-line copy was equally unattached — so this is not a
regression, only an unfinished part of making Cursor routing real.

## Trigger to fix

Fix when Cursor is next actually used against this repository, when any
`.cursor/rules/` file is added or edited, or when a Cursor session is observed
applying non-canonical package or backend guidance.
