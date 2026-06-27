---
name: solid-principles
description: Provides SOLID design principles guidance for both frontend (React) and backend (NestJS) code. This skill should be used when generating, reviewing, or refactoring code to ensure adherence to Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles.
---

# SOLID Principles Skill

Enforce SOLID design principles across all generated code. Apply these principles alongside existing project skills (design-patterns, service-pattern-nestjs, frontend-code-quality, etc.). SOLID is an additional lens through which to evaluate every piece of code.

## When to Use

- When **generating** new code (services, components, hooks, controllers, repositories).
- When **reviewing** or **refactoring** existing code.
- When a code smell suggests a design concern (see quick-reference table below).

## Platform-Specific References

SOLID applies differently to OOP-based backends and functional/component-based frontends. Load the appropriate reference based on the code being written:

- **Backend (NestJS)**: Read [references/backend.md](references/backend.md) for class-based patterns — constructor injection, strategy pattern, interface contracts, lean DTOs.
- **Frontend (React)**: Read [references/frontend.md](references/frontend.md) for functional patterns — composition, slot props, hook abstractions, context-based DI.

When working on **shared packages** (e.g. `@eridu/api-types`), apply the principles from **both** references as relevant.

## Quick Reference Checklist

Before generating or reviewing code, verify:

| Principle | Question to Ask |
|:---|:---|
| **SRP** | Does this class/function/component have more than one reason to change? |
| **OCP** | Will adding a new variant require editing existing code, or just adding new code? |
| **LSP** | Can this subtype/component replace its parent everywhere without surprises? |
| **ISP** | Is any consumer forced to depend on methods/props it does not use? |
| **DIP** | Does this high-level module import a concrete low-level module directly? |

If the answer reveals a violation, refactor before proceeding.

## Related Skills

- **[Design Patterns](../design-patterns/SKILL.md)**: High-level architecture and layer boundaries.
- **[Code Quality](../code-quality/SKILL.md)**: Linting, testing, and type safety.
- **[Service Patterns](../service-pattern-nestjs/SKILL.md)**: NestJS service implementation.
- **[Frontend Code Quality](../frontend-code-quality/SKILL.md)**: React-specific code standards.
- **[Frontend API Layer](../frontend-api-layer/SKILL.md)**: API abstraction patterns.
