# Documentation Organization

## Canonical Sources

- **Structure and lifecycle:** `docs/README.md`
- **Doc layering and placement:** `monorepo-doc-layering` skill
- **Promotion and phase-boundary workflow:** `.agents/workflows/doc-lifecycle.md`
- **Doc hygiene (reasoning artifacts, current-truth):** `doc-hygiene` skill

## Link Hygiene

1. Markdown links in repo docs must use relative paths from the current document.
2. Never use absolute filesystem paths such as `/Users/...` in Markdown links.
3. Never use `file://` URLs in repo documentation.
4. Prefer Markdown links to the canonical doc rather than pasting raw path text when the target should be navigable.
5. After editing docs, validate the touched doc tree for broken relative links before finishing.
