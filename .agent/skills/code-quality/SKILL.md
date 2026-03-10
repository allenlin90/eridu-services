---
name: code-quality
description: Provides general code quality and best practices guidance applicable across languages and frameworks. Focuses on linting, testing, and type safety.
---

# Code Quality Skill

Provides general code quality and best practices guidance applicable across languages and frameworks. Focuses on **Linting**, **Testing**, and **Type Safety**.

For architecture-specific patterns (N+1 queries, Soft Deletes, etc.), refer to:
- **[Database Patterns](../database-patterns/SKILL.md)**
- **[Service Patterns](../service-pattern-nestjs/SKILL.md)**
- **[Repository Patterns](../repository-pattern-nestjs/SKILL.md)**

## Pre-Submission Checklist

**Before marking any task as complete**:

- [ ] Ensure `pnpm lint` passes (no ESLint rule disables).
- [ ] Ensure `pnpm test` passes (new features have tests).
- [ ] Ensure `pnpm build` succeeds (no TypeScript errors).
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

### Code-First Review Rule (CRITICAL)

**Passing tests do not prove correctness — always verify the implementation directly.**

When reviewing code that includes test changes:

1. Read the implementation file first; form a hypothesis about what the correct behavior should be.
2. Then read the test file: verify the test would fail if the implementation were wrong (not just that it currently passes).
3. Watch for these test anti-patterns that give false confidence:
   - Assertions that only check call count (`toHaveBeenCalled`) without verifying arguments
   - Mocks that return the "right" value regardless of input, masking incorrect query construction
   - Tests updated to match new behavior without explaining why the old behavior was wrong
   - Missing negative/edge-case assertions (e.g., a test that only covers the happy path of a guard)
4. A test suite passing after a fix **is a gate**, not verification. The fix is verified by reading the corrected code and confirming the logic is sound.

**Example (Unit Test)**:
```typescript
describe('UserService', () => {
  it('should return user when found', async () => {
    // 1. Arrange (Mock dependencies)
    const mockRepo = { findByUid: jest.fn().mockResolvedValue(user) };
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

## Common Anti-Patterns (General)

1.  **Ignoring Lint Errors**: Address them immediately.
2.  **Logic in Controllers**: Controllers should only handle HTTP req/res. Move logic to Services.
3.  **Hardcoded Strings/Magic Numbers**: Use constants or enums.
4.  **Complex Conditionals**: Break down complex `if/else` blocks into helper methods.
5.  **Catch-All Error Handling**: Avoid just using `console.error`. Handle specific errors or let global filters handle them.

## Related Skills

- **[Database Patterns](../database-patterns/SKILL.md)**: N+1 queries, Soft Deletes, Bulk Operations.
- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)**: Business logic errors, Transactions.
- **[Repository Pattern NestJS](../repository-pattern-nestjs/SKILL.md)**: Data access rules.
- **[Backend Controller Pattern NestJS](../backend-controller-pattern-nestjs/SKILL.md)**: NestJS-specific controller rules.
- **[Frontend Code Quality](../frontend-code-quality/SKILL.md)**: React/Frontend specific patterns.
