---
name: code-quality
description: Apply linting, testing, type-safety, and SOLID design review to generated or changed code. Use the enforcer skill for repo-wide audits.
---

# Code Quality Skill

Provides general code quality and best practices guidance applicable across languages and frameworks. Focuses on **Linting**, **Testing**, and **Type Safety**.

For architecture-specific patterns (N+1 queries, Soft Deletes, etc.), refer to:
- **[Database Patterns](../database-patterns/SKILL.md)**
- **[Service Patterns](../nestjs-architecture/references/service-pattern.md)**
- **[Repository Patterns](../nestjs-architecture/references/repository-pattern.md)**

## Pre-Submission Checklist

**Before marking any task as complete**:

- [ ] `pnpm --filter <app> lint` passes (no ESLint rule disables).
- [ ] `pnpm --filter <app> typecheck` passes.
- [ ] `pnpm --filter <app> build` succeeds — mandatory, stricter than typecheck alone.
- [ ] `pnpm --filter <app> test` passes (new features have tests).
- [ ] **Avoid** `any` / `unknown` types (maintain strict type safety).
- [ ] **Remove** `console.log` statements (use a dedicated logger).
- [ ] Ensure error messages are clear and actionable.

## Linting

**We use ESLint with strict rules.**

- **Command**: `pnpm lint` (or `pnpm lint -- --fix`)
- **Rule**: NEVER disable rules with `eslint-disable`. Fix the underlying issue.

**Common Fixes**:
- `@typescript-eslint/no-explicit-any`: Define a proper interface/DTO.
- `no-unused-vars`: Remove the variable or prefix with `_`.
- `no-console`: Inject a `Logger` service.

## Testing

**All new features require tests.**

- **Unit Tests**: Test individual classes (Services, Utils) with **mocked dependencies**.
- **Integration Tests**: Test interactions (Repositories) with **real database/services**.

**Example (Unit Test)**:
```typescript
describe('UserService', () => {
  it('should return user when found', async () => {
    // 1. Arrange (Mock dependencies)
    const mockRepo = { findByUid: vi.fn().mockResolvedValue(user) };  // Vitest — not jest.fn()
    const service = new UserService(mockRepo as any);

    // 2. Act
    const result = await service.getUser('u_1');

    // 3. Assert
    expect(result).toEqual(user);
    expect(mockRepo.findByUid).toHaveBeenCalledWith('u_1');
  });
});
```

## TypeScript Type Safety

**Strict mode is enforced.**

- ❌ **Avoid `any` / `unknown`**:
  ```typescript
  // BAD
  const data: any = req.body;

  // GOOD
  const data: CreateUserDto = req.body;
  ```

- ✅ **Use DTOs and Interfaces**: Always define shapes for inputs and outputs.
- ✅ **Trust the Compiler**: If it compiles, it should likely run (if types are accurate).

## SOLID Design Lens

Apply when **generating** new code (services, components, hooks, controllers, repositories), when **reviewing** or **refactoring** existing code, or when a code smell suggests a design concern. SOLID is an additional lens on top of the checks above, not a replacement for them.

| Principle | Question to Ask |
|:---|:---|
| **SRP** | Does this class/function/component have more than one reason to change? |
| **OCP** | Will adding a new variant require editing existing code, or just adding new code? |
| **LSP** | Can this subtype/component replace its parent everywhere without surprises? |
| **ISP** | Is any consumer forced to depend on methods/props it does not use? |
| **DIP** | Does this high-level module import a concrete low-level module directly? |

If the answer reveals a violation, refactor before proceeding.

SOLID applies differently to OOP-based backends and functional/component-based frontends. Load the reference for the code being written:

- **Backend (NestJS)**: [references/solid-backend.md](references/solid-backend.md) — constructor injection, strategy pattern, interface contracts, lean DTOs.
- **Frontend (React)**: [references/solid-frontend.md](references/solid-frontend.md) — composition, slot props, hook abstractions, context-based DI.

For **shared packages** (e.g. `@eridu/api-types`), apply both references as relevant.

> For `erify_api` module placement and persistence selection, [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is authoritative and overrides the generic SRP reading of "one service per entity".

## Common Anti-Patterns (General)

1.  **Ignoring Lint Errors**: Address them immediately.
2.  **Logic in Controllers**: Controllers should only handle HTTP req/res. Move logic to Services.
3.  **Hardcoded Strings/Magic Numbers**: Use constants or enums.
4.  **Complex Conditionals**: Break down complex `if/else` blocks into helper methods.
5.  **Catch-All Error Handling**: Avoid just using `console.error`. Handle specific errors or let global filters handle them.

## Related Skills

- **[Database Patterns](../database-patterns/SKILL.md)**: N+1 queries, Soft Deletes, Bulk Operations.
- **[Service Pattern NestJS](../nestjs-architecture/references/service-pattern.md)**: Business logic errors, Transactions.
- **[Repository Pattern NestJS](../nestjs-architecture/references/repository-pattern.md)**: Data access rules.
- **[Backend Controller Pattern NestJS](../nestjs-architecture/references/controller-pattern.md)**: NestJS-specific controller rules.
- **[Frontend Code Quality](../code-quality/references/frontend-code-quality.md)**: React/Frontend specific patterns.
- **[Design Patterns](../design-patterns/SKILL.md)**: High-level architecture and layer boundaries.
- **[Engineering Best Practices Enforcer](../engineering-best-practices-enforcer/SKILL.md)**: Staged repo-wide quality audits.
