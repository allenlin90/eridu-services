# Monorepo Architecture & Design Patterns

okf_version: "0.2"
type: architecture_doctrine
status: active
stale_after: "2027-01-01"

## Monorepo Layering & Boundaries

1. **Modular Monolith Backend (`erify_api`)**:
   - Organized by business capabilities (`show-catalog`, `schedule-publishing`) rather than database models.
   - Flow: REST Controller / MCP Tool → Capability Service / Use Case → Private Persistence (`TransactionHost.tx` or Repository).
2. **External UID Abstraction**:
   - Internal DB IDs (integers/UUIDs) must NEVER leave the API boundary.
   - All public endpoints consume and return `{prefix}_{nanoid}` UIDs (e.g. `show_xyz123`, `studio_abc789`).
3. **Transaction Management**:
   - All transactions resolve through `@nestjs-cls/transactional` (`TransactionHost.tx`).
   - Transactions are owned by Orchestration Services, never Repositories.
4. **Monorepo Package Rules**:
   - Internal dependencies use `workspace:*` in `package.json`.
   - Packages in `packages/` export compiled JavaScript and declarations from `dist/` with explicit subpath `exports`.
