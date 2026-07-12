# Changelog — Company Wiki

Notable schema and tooling changes to this directory. Content additions/edits are tracked by normal Git history, not here.

## 2026-07-13

- Phase 1 content contract established: `tools/wiki-schema.json` (sensitivity/status/audience vocabulary), `tools/validate-wiki` (frontmatter, enum, date, duplicate-id, and wikilink validation), directory skeleton (`intake/`, `content/`, `generated/`).
- Audience vocabulary follows the Member / Team-Lead / Manager tier structure within each pillar (Commerce/Erify/Erisa), plus `finance-manager`/`hr-manager` and `company-wide` shorthand. `org-general` (GM, read-only) and Admins (read-write) are granted automatically at sync time, never listed in a document's `audiences`.
