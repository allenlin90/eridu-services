# Cursor monorepo package guidance duplicates canonical instructions

## Affected surface

`.cursor/rules/monorepo_packages_guide.mdc` and the supplementary
`.claude/memory/monorepo-package-rules.md`.

## Current behavior

The Cursor rule contains a long standalone copy of shared package and dependency
guidance. Claude's supplementary memory names that file as one of its sources.
The canonical repository direction says vendor adapters should route to shared
instructions in `AGENTS.md`, `.agents/rules/`, skills, and workflows instead of
maintaining another full copy.

## Desired behavior

Reconcile the shared monorepo package rules into one canonical source, replace
the Cursor document with a small routing or compatibility adapter, and update
supplementary memory and audit references in the same PR. Preserve any
Cursor-only frontmatter or behavior that is actually required by Cursor.

## Risk

Duplicated rules can drift and cause different agents to apply conflicting
package export, dependency, or verification conventions. An unreviewed deletion
could also remove Cursor-specific routing behavior, so the reconciliation needs
an instruction-surface audit rather than a mechanical file removal.

## Trigger to fix

Fix when monorepo package guidance changes next, Cursor routing is updated, or a
review finds an actual contradiction between the duplicated surfaces.
