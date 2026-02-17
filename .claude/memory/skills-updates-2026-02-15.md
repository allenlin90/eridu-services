# Skills Updates - 2026-02-15

## Summary

Updated backend skills to add explicit guidance on **DTO property filtering**, **context-agnostic service design**, and **strict Prisma type prohibition**.

---

## 🎯 Updates Made

### 1. backend-controller-pattern-nestjs/SKILL.md

**Enhanced Section 5: Payload Translation & Property Filtering**

**Added**:
- Explicit requirement to filter unnecessary DTO properties
- Anti-patterns showing wrong approaches (spread operator, delete properties, passing entire DTO)
- Complex DTO example showing how to handle HTTP-specific fields
- Emphasized that services must not know about ALL DTO fields

**Key Addition**:
```typescript
// ✅ GOOD: Extract ONLY what service needs
const { name, email } = dto;
// Filtered out: dto.pageSize, dto.sortOrder, etc.
return this.userService.create({ name, email, org: { connect: { uid: orgId } } });

// ❌ BAD: Pass entire DTO
return this.userService.create(dto); // Service now knows about ALL DTO fields

// ❌ BAD: Spread operator without explicit filtering
return this.userService.create({ ...dto }); // Same problem
```

---

### 2. service-pattern-nestjs/SKILL.md

#### A. New Section: Context-Agnostic Service Design

**Added** (before "Strict ORM Decoupling"):
- Complete section on context-agnostic design principles
- Explanation of multiple invocation contexts (HTTP, GraphQL, CLI, jobs, other services)
- 5 key design principles
- Full example showing correct vs incorrect patterns
- Anti-patterns section showing context-coupled services
- Key insight: "If your service can't be called from a CLI script without changes, it's too coupled"

**Design Principles Added**:
1. ✅ Services define clean input/output contracts
2. ✅ Services don't know who calls them
3. ✅ Services don't know caller context
4. ✅ Same method reusable everywhere
5. ✅ Services throw domain exceptions (with trade-off note)

#### B. New Section: Error Handling Trade-Off

**Added**:
- Acknowledgment that HttpError couples services to HTTP
- Comparison of current pattern (pragmatic) vs ideal pattern (context-agnostic)
- Explanation of project's decision to use HttpError for simplicity
- Trade-offs table (simpler/direct vs HTTP-coupled/less flexible)
- Note that all other context-agnostic principles still apply

#### C. Strengthened ORM Decoupling Section

**Changed**:
- Title: "Avoiding ORM Coupling" → **"Strict ORM Decoupling"**
- Language: "MUST NEVER" → **"STRICTLY FORBIDDEN"**
- Added: "This rule has NO exceptions"
- Emphasized: Repository pattern encapsulates ALL database concerns

#### D. Updated Best Practices Checklist

**Reorganized** into three sections:

**1. Context-Agnostic Design** (NEW):
- 🔴 Critical: Services accept domain payloads, NOT DTOs or HTTP objects
- 🔴 Critical: Services return domain entities, NOT HTTP responses
- 🔴 Critical: Services don't know who is calling them
- 🔴 Critical: Service methods callable from any context without modification
- Use HttpError for exceptions (with trade-off note)

**2. ORM Decoupling (STRICT)** (STRENGTHENED):
- 🔴 **STRICT**: ZERO `import { Prisma }` statements in service files
- 🔴 **STRICT**: ZERO `Prisma.*` types in service method signatures
- 🔴 **STRICT**: Define Payload types in schema files ONLY
- 🔴 **STRICT**: Use `Parameters<Repository['method']>` for pass-through
- 🔴 **STRICT**: Delegate ALL filter building to repository layer

**3. Standard Patterns** (existing items):
- Extend BaseModelService
- Define UID_PREFIX
- etc.

---

### 3. known-issues.md

**Updated Introduction**:
- Added warning that even "best" examples (task, task-template) need refactoring
- Listed specific refactoring needs:
  - Controllers must filter unnecessary DTO properties
  - Services must be strictly forbidden from ANY Prisma imports
  - Services must be fully context-agnostic
- Noted skills were updated 2026-02-15 to reflect stricter requirements

---

## 📋 Key Changes Summary

| Skill | Section | Change |
|-------|---------|--------|
| backend-controller-pattern-nestjs | Section 5 | Added explicit DTO property filtering guidance |
| service-pattern-nestjs | NEW: Context-Agnostic Design | Added full section on context-agnostic principles |
| service-pattern-nestjs | NEW: Error Handling Trade-Off | Acknowledged HttpError coupling, explained trade-off |
| service-pattern-nestjs | ORM Decoupling | Strengthened: "Avoiding" → "Strict", "MUST NEVER" → "STRICTLY FORBIDDEN" |
| service-pattern-nestjs | Checklist | Reorganized into 3 sections, added context-agnostic items, strengthened ORM items |
| known-issues.md | Introduction | Added note that even best examples need refactoring |

---

## ⚠️ Important Notes

### Prisma Type Prohibition is NOW STRICT

**Previous** (implied optional):
> Services MUST NEVER import or use Prisma types...

**Now** (explicit strict):
> Services are STRICTLY FORBIDDEN from importing or using Prisma types. This rule has NO exceptions.

### Controllers MUST Filter Properties

**New explicit requirement**:
```typescript
// Controllers must extract ONLY what service contract requires
const { name, email } = dto;  // Explicit extraction
return this.userService.create({ name, email });

// NOT allowed:
return this.userService.create(dto);         // ❌ Passing entire DTO
return this.userService.create({ ...dto });  // ❌ Spread without filter
```

### Context-Agnostic Test

**New principle**:
> "If your service can't be called from a CLI script without changes, it's too coupled."

Services must be callable from:
- HTTP controllers
- GraphQL resolvers
- CLI commands
- Background jobs
- Other services

---

## 🔄 Refactoring Needed

Even the "best" examples need updates:

### task-template Model
- ✅ Has payload types
- ✅ Minimal Prisma exposure
- ❌ Still uses some `Parameters<>` pattern (indirectly includes Prisma)
- ❌ Controllers may pass entire DTOs
- ❌ Services use HttpError (couples to HTTP, but accepted trade-off)

### All Models
- Need to ensure controllers filter DTO properties explicitly
- Need to verify services are callable from non-HTTP contexts
- Need to eliminate ANY Prisma type imports in services

---

## 📖 Documentation Authority

**Updated hierarchy**:
1. **Skills** (`.claude/skills/`) - **PRIMARY AUTHORITY** (updated 2026-02-15)
2. Memory files - Supplementary context
3. Existing code - Examples (may contain violations)

**Key skills updated**:
- `backend-controller-pattern-nestjs` - DTO filtering, payload translation
- `service-pattern-nestjs` - Context-agnostic design, strict ORM decoupling

---

## ✅ Next Steps for Codebase

1. **Review task-template** - Even "best" example needs refinement
2. **Audit controllers** - Ensure explicit property filtering (not entire DTO passing)
3. **Audit services** - Verify ZERO Prisma imports
4. **Test context-agnosticism** - Try calling services from CLI/jobs
5. **Progressive refactoring** - Apply to other 14 models

**Status**: Skills updated ✅ | Codebase refactoring pending ⏳
