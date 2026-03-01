# SOLID Principles — Backend (NestJS / TypeScript)

Apply these principles to all backend code: controllers, services, repositories, DTOs, and modules.

---

## S — Single Responsibility Principle (SRP)

**A class should have one and only one reason to change.**

- **Services**: One service per domain entity. Orchestration services coordinate multiple model services but do not own entity logic.
- **Controllers**: Handle HTTP concerns only (parsing, validation, status codes). Delegate all business logic to services.
- **Repositories**: Encapsulate data access only. No business rules, no HTTP awareness.
- **Functions**: Extract helpers when a function exceeds ~30 lines or handles more than one concern (e.g. validation **and** transformation).

```typescript
// ❌ BAD — service mixes business logic with notification concern
class OrderService {
  async createOrder(dto: CreateOrderDto) {
    const order = await this.repo.create(dto);
    await this.mailer.send(order.userEmail, 'Order Confirmed');
    return order;
  }
}

// ✅ GOOD — notification is a separate concern
class OrderService {
  async createOrder(dto: CreateOrderDto) {
    return this.repo.create(dto);
  }
}

class OrderNotificationService {
  async notifyOrderCreated(order: Order) {
    await this.mailer.send(order.userEmail, 'Order Confirmed');
  }
}
```

### SRP Decision Guide

| Smell | Action |
|:---|:---|
| Method does validation **and** persistence | Extract a validator class or pipe |
| Service sends emails / notifications | Extract a notification service |
| Controller contains `if` business logic | Move to service |
| Function > 30 lines | Split into focused helpers |

---

## O — Open/Closed Principle (OCP)

**Modules should be open for extension but closed for modification.**

- **Strategy Pattern**: Use injectable strategies instead of growing `if/else` or `switch` chains. Register new behavior by adding a new class, not editing an existing one.
- **Decorators**: Leverage NestJS decorators (`@Injectable`, custom param decorators) to extend behavior without modifying core code.
- **Module Composition**: Compose features by importing feature modules rather than editing a monolithic module.
- **Guards & Interceptors**: Add cross-cutting concerns (auth, logging, caching) by attaching guards/interceptors, not by editing controller methods.

```typescript
// ❌ BAD — adding a new export format requires editing this function
function exportReport(format: string, data: Report) {
  if (format === 'pdf') { /* ... */ }
  else if (format === 'csv') { /* ... */ }
  else if (format === 'xlsx') { /* ... */ }
}

// ✅ GOOD — new formats added by implementing the interface
interface ReportExporter {
  readonly format: string;
  export(data: Report): Buffer;
}

@Injectable()
class PdfExporter implements ReportExporter {
  readonly format = 'pdf';
  export(data: Report): Buffer { /* ... */ }
}

@Injectable()
class CsvExporter implements ReportExporter {
  readonly format = 'csv';
  export(data: Report): Buffer { /* ... */ }
}

// Registry resolves the right exporter at runtime
@Injectable()
class ReportExporterRegistry {
  constructor(
    @Inject('EXPORTERS') private readonly exporters: ReportExporter[],
  ) {}

  getExporter(format: string): ReportExporter {
    const exporter = this.exporters.find(e => e.format === format);
    if (!exporter) throw new BadRequestException(`Unsupported format: ${format}`);
    return exporter;
  }
}
```

### OCP Indicators

| Smell | Refactor To |
|:---|:---|
| Growing `switch`/`if-else` on a type field | Strategy pattern + DI registry |
| Editing existing service to add a new variant | New class implementing shared interface |
| Modifying a module to add cross-cutting logic | Guard, Interceptor, or Pipe |

---

## L — Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types without altering program correctness.**

- **Interface Contracts**: When a service implements an interface, honor the contract completely. Do not throw `NotImplementedError` for required methods.
- **Base Classes**: When extending `BaseRepository` or similar, preserve the semantics of inherited methods. Add new methods instead of silently altering return types or postconditions.
- **Error Handling**: If a base method returns `T | null`, a subclass must not throw on `null`. Add a separate `findOrFail` variant instead.

```typescript
// ❌ BAD — subclass changes the contract
class BaseRepository<T> {
  async findByUid(uid: string): Promise<T | null> { /* ... */ }
}

class StrictUserRepo extends BaseRepository<User> {
  // Breaks LSP: callers expect T | null, but this throws
  async findByUid(uid: string): Promise<User> {
    const user = await super.findByUid(uid);
    if (!user) throw new NotFoundException();
    return user;
  }
}

// ✅ GOOD — add a separate method, keep base contract intact
class UserRepo extends BaseRepository<User> {
  async findByUidOrFail(uid: string): Promise<User> {
    const user = await this.findByUid(uid);
    if (!user) throw new NotFoundException();
    return user;
  }
}
```

### LSP Checklist

- ✅ Override only to **specialize** behavior, never to **change** the contract.
- ✅ If adding constraints, expose them via a **new method name**.
- ✅ Return types of overriden methods must be **covariant** (same or narrower), never wider.
- ❌ Never throw exceptions where the base type would return normally.
- ❌ Never silently swallow errors where the base type would throw.

---

## I — Interface Segregation Principle (ISP)

**No client should be forced to depend on methods it does not use.**

- **Lean DTOs**: Create specific DTOs for each use case (`CreateUserDto`, `UpdateUserDto`) rather than a single bloated `UserDto` with optional fields.
- **Focused Interfaces**: Split large service interfaces by consumer need instead of forcing all consumers to depend on every method.
- **Module Exports**: Export only services, not repositories (already enforced by design-patterns skill).

```typescript
// ❌ BAD — one fat interface forces all consumers to see everything
interface UserService {
  findByUid(uid: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
  update(uid: string, dto: UpdateUserDto): Promise<User>;
  delete(uid: string): Promise<void>;
  sendWelcomeEmail(uid: string): Promise<void>;
  generateReport(uid: string): Promise<Buffer>;
}

// ✅ GOOD — segregated by consumer need
interface UserReader {
  findByUid(uid: string): Promise<User | null>;
  findMany(filter: UserFilter): Promise<User[]>;
}

interface UserWriter {
  create(dto: CreateUserDto): Promise<User>;
  update(uid: string, dto: UpdateUserDto): Promise<User>;
  delete(uid: string): Promise<void>;
}
```

### ISP Decision Guide

| Smell | Action |
|:---|:---|
| DTO has many optional fields for different use cases | Split into separate DTOs per use case |
| Service interface has > 8 methods | Group by consumer need into smaller interfaces |
| Consumer imports a service but uses only 1–2 methods | Consider a focused facade or separate interface |

---

## D — Dependency Inversion Principle (DIP)

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

- **NestJS DI**: Inject dependencies via constructor injection. Never instantiate dependencies with `new` inside a class.
- **Tokens and Interfaces**: Use injection tokens or interfaces for cross-cutting concerns (loggers, config, external clients) so they can be swapped or mocked.
- **Layer Isolation**: Controllers depend on service abstractions, services depend on repository abstractions — never the reverse.
- **Testability**: DIP enables easy mocking — every injected dependency can be replaced in tests.

```typescript
// ❌ BAD — high-level service directly depends on a concrete low-level implementation
class UserService {
  private repo = new PrismaUserRepository();
  private logger = new ConsoleLogger();
}

// ✅ GOOD — depend on abstractions, inject at runtime
@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: Logger,
  ) {}
}
```

### DIP Layer Diagram

```
Controller  →  depends on  →  ServiceInterface  ←  implements  ←  ServiceImpl
ServiceImpl →  depends on  →  RepositoryInterface ← implements  ←  RepositoryImpl
```

Every arrow points toward an **abstraction**, not a **concrete class**.

---

## Related Skills

- **[Design Patterns](../../design-patterns/SKILL.md)**: Architecture and layer boundaries.
- **[Service Patterns](../../service-pattern-nestjs/SKILL.md)**: NestJS service implementation.
- **[Repository Patterns](../../repository-pattern-nestjs/SKILL.md)**: Data access patterns.
- **[Backend Controller Patterns](../../backend-controller-pattern-nestjs/SKILL.md)**: Controller conventions.
- **[Code Quality](../../code-quality/SKILL.md)**: Linting, testing, type safety.
