# Cursor rule auto-attach is unverified against a live Cursor session

## Affected surface

`.cursor/rules/erify_api_guide.mdc` and
`.cursor/rules/monorepo_packages_guide.mdc`.

## Current behavior

Both adapters now carry a `description` + `globs` frontmatter block matching the
shape already used by `.agents/rules/02-erify-api-guide.mdc` and
`.agents/rules/03-monorepo-packages.mdc` (PR #381). That shape is the
repository convention, but no Cursor session has confirmed that either rule is
actually attached when working under `apps/erify_api/` or `packages/*`.

Two details are unverified specifically because there is no live check:

- `alwaysApply` is omitted. Cursor's own generated `.mdc` files include
  `alwaysApply: false` alongside `globs`; an absent field should default to
  Auto Attached, but that is assumed, not observed.
- `globs: packages/**/*, apps/**/*` has a space after the comma. Cursor parses
  the value as a comma-separated list and normally trims whitespace, but that
  is also assumed.

## Desired behavior

Open a Cursor session against this repository, edit a file under
`apps/erify_api/` and one under `packages/`, and confirm the corresponding
adapter appears in Cursor's attached-rules context. If a rule does not attach,
add `alwaysApply: false` and/or remove the whitespace from the `globs` list,
then re-check.

## Risk

Low correctness risk — nothing else depends on these files. The cost of the gap
is the same one the original entry described: routing exists in the repository
but may never reach a Cursor agent, which then falls back to whatever it infers
instead of `AGENTS.md` and the canonical skills. The frontmatter shape makes
attachment likely; this entry tracks the confirmation, not a known failure.

## Trigger to fix

Fix when Cursor is next actually used against this repository, when any
`.cursor/rules/` file is added or edited, or when a Cursor session is observed
applying non-canonical package or backend guidance.

## Acceptance criteria

- A Cursor session confirms both adapters attach on their declared globs.
- Any frontmatter correction required to make attachment work is committed.
- This entry and its `README.md` row are deleted in the same change.
