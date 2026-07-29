# Changelog — Company Wiki

Notable schema and tooling changes to this directory. Content additions/edits are tracked by normal Git history, not here.

## 2026-07-28

- `org-general`'s automatic grant is now **sensitivity-scoped**. The 2026-07-13 entry below records it as applying "regardless of sensitivity", which contradicted the sensitivity ladder in the same schema: `department` is defined as "one pillar only" and `restricted` as "named leadership groups only", neither of which can include the GM. `org-general` is now auto-granted only on collections whose content is entirely `public` or `internal`; Admins are unchanged and still granted everywhere.
- The rule had never been implemented — `tools/validate-wiki`'s `expandAudiences` only ever expanded a document's own `audiences`. It is now enforced, for the first time, by `scripts/ai/creator-kb/upload_kb.py` via the `automatic`/`sensitivity_scoped_read` block in `ai/openwebui/access/audience-group-map.json`.

## 2026-07-13

- Phase 1 content contract established: `tools/wiki-schema.json` (sensitivity/status/audience vocabulary), `tools/validate-wiki` (frontmatter, enum, date, duplicate-id, and wikilink validation), directory skeleton (`intake/`, `content/`, `generated/`).
- Audience vocabulary follows the Member / Team-Lead / Manager tier structure within each pillar (Commerce/Erify/Erisa), plus `finance-manager`/`hr-manager` and `company-wide` shorthand. `org-general` (GM, read-only) and Admins (read-write) are granted automatically at sync time, never listed in a document's `audiences`.
