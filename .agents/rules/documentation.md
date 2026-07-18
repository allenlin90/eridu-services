# Documentation Organization

## Canonical Sources

- **Structure and lifecycle:** `docs/README.md`
- **Doc layering and placement:** [monorepo-doc-layering](../skills/monorepo-doc-layering/SKILL.md)
- **Lifecycle bookkeeping:** [doc-lifecycle](../skills/doc-lifecycle/SKILL.md)
- **Doc hygiene (reasoning artifacts, current-truth):** [doc-hygiene](../skills/doc-hygiene/SKILL.md)

## Bookkeeping Invariants

1. Keep one canonical document for each durable question: ideation decides whether, a PRD defines the committed product outcome, an optional design defines unresolved implementation choices, and the roadmap records sequence and status.
2. Do not duplicate requirements across a PRD, design, roadmap entry, and implementation plan. Link the canonical source instead.
3. A documentation lifecycle change updates the owning index, status, roadmap link, and cross-references in the same PR.
4. Delete retired planning artifacts after preserving durable decisions in their canonical home. Git history is the archive; do not leave retirement stubs.
5. Use a separate bookkeeping PR only for phase-wide reconciliation or cleanup that does not belong to one feature implementation PR.

## Link Hygiene

1. Markdown links in repo docs must use relative paths from the current document.
2. Never use absolute filesystem paths such as `/Users/...` in Markdown links.
3. Never use `file://` URLs in repo documentation.
4. Prefer Markdown links to the canonical doc rather than pasting raw path text when the target should be navigable.
5. After editing docs, validate the touched doc tree for broken relative links before finishing.
