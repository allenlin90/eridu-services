# Known Issues & Technical Debt

## ✅ RESOLVED: Service Layer Violations (Feb 2026)

All services now follow correct patterns:
- Payload types defined in schema files
- No Prisma.* types in service method signatures
- Repository handles where-clause building

## ✅ RESOLVED: Module Export Policy (Feb 2026)

All modules now strictly export Services only.
Repositories are internal implementation details not exposed outside their modules.
Join tables (e.g. TaskTarget) now also have their own thin services to wrap their repositories and act as the module export.

## Known Good Patterns to Reference

When in doubt, refer to these files:

✅ **Best service example**: `/apps/erify_api/src/models/task/task.service.ts`
✅ **Best schema example**: `/apps/erify_api/src/models/membership/schemas/studio-membership.schema.ts`
✅ **Best repository example**: Any repository (all follow pattern correctly)

## Related Documentation

- [Schema Patterns](./schema-patterns.md) - Three-tier schema architecture
- [Tech Stack](./tech-stack.md) - Module organization standards
