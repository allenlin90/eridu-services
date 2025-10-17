# AI Assistant Documentation Update Guide

## Overview

This guide provides specific instructions for AI assistants when generating or modifying code in the Eridu Services API. It ensures that documentation remains synchronized with code changes.

## Pre-Code Generation Checklist

### 🔍 **Before Making Any Code Changes**

1. **Analyze Impact Scope**
   - [ ] Identify all modules that will be affected
   - [ ] List all services that will be modified
   - [ ] Note any new API endpoints
   - [ ] Check for entity relationship changes
   - [ ] Identify new dependencies

2. **Review Current Documentation**
   - [ ] Read `ARCHITECTURE.md` to understand current structure
   - [ ] Check `MODULE_DIAGRAMS.md` for current relationships
   - [ ] Review `QUICK_REFERENCE.md` for current patterns
   - [ ] Understand existing naming conventions

3. **Plan Documentation Updates**
   - [ ] List all documentation files that need updates
   - [ ] Identify which sections need modification
   - [ ] Plan new diagrams or tables needed
   - [ ] Consider new code examples required

## Code Generation with Documentation Updates

### 🏗️ **When Creating New Modules**

#### Step 1: Generate Module Code
```typescript
// Generate the module file
@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [NewEntityService, NewEntityRepository],
  exports: [NewEntityService],
})
export class NewEntityModule {}
```

#### Step 2: Update Architecture Documentation
```markdown
# In ARCHITECTURE.md - Domain Modules table
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewEntityModule | New entity management | NewEntityService | PrismaModule, UtilityModule |
```

#### Step 3: Update Mermaid Diagrams
```mermaid
# In MODULE_DIAGRAMS.md - Add to module dependency diagram
graph TB
    Admin --> AdminNew[AdminNewEntityModule]
    AdminNew --> New[NewEntityModule]
    New --> Prisma[PrismaModule]
    New --> Utility[UtilityModule]
```

#### Step 4: Update Quick Reference
```markdown
# In QUICK_REFERENCE.md - Add to module tables and API endpoints
## Core Modules
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewEntityModule | New entity management | NewEntityService | PrismaModule, UtilityModule |

## API Endpoints
### New Entity (`/admin/new-entities`)
- `GET /admin/new-entities` - List new entities (paginated)
- `POST /admin/new-entities` - Create new entity
- `GET /admin/new-entities/:uid` - Get new entity by UID
- `PUT /admin/new-entities/:uid` - Update new entity
- `DELETE /admin/new-entities/:uid` - Soft delete new entity
```

### 🔧 **When Modifying Services**

#### Step 1: Update Service Code
```typescript
// Add new method to service
async newMethod(uid: string, data: Record<string, unknown>): Promise<Entity> {
  // Implementation
}
```

#### Step 2: Update Service Documentation
```markdown
# In ARCHITECTURE.md and QUICK_REFERENCE.md - Update service tables
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| EntityService | Entity CRUD operations | createEntity, getEntityById, updateEntity, deleteEntity, **newMethod** | EntityRepository, UtilityService |
```

#### Step 3: Update Code Examples
```typescript
// Update examples in documentation
const result = await entityService.newMethod(uid, data);
```

### 🌐 **When Adding API Endpoints**

#### Step 1: Generate Controller Code
```typescript
@Post('search')
async searchEntities(@Body() searchDto: SearchEntityDto) {
  return this.adminEntityService.searchEntities(searchDto);
}
```

#### Step 2: Update Endpoint Documentation
```markdown
# In ARCHITECTURE.md and QUICK_REFERENCE.md
### Entities (`/admin/entities`)
- `GET /admin/entities` - List entities (paginated)
- `POST /admin/entities` - Create entity
- `GET /admin/entities/:uid` - Get entity by UID
- `PUT /admin/entities/:uid` - Update entity
- `DELETE /admin/entities/:uid` - Soft delete entity
- `POST /admin/entities/search` - **Search entities** (NEW)
```

#### Step 3: Update Data Format Examples
```json
// Add new request/response examples
{
  "search_query": "example",
  "filters": {
    "is_active": true
  }
}
```

### 🔗 **When Changing Entity Relationships**

#### Step 1: Update Database Schema
```prisma
model NewEntity {
  id        Int      @id @default(autoincrement())
  uid       String   @unique
  name      String
  user_id   Int?
  user      User?    @relation(fields: [user_id], references: [id])
}
```

#### Step 2: Update Entity Relationship Diagram
```mermaid
# In MODULE_DIAGRAMS.md
erDiagram
    User {
        int id PK
        string uid UK
        string email UK
        string name
    }
    
    NewEntity {
        int id PK
        string uid UK
        string name
        int user_id FK
    }
    
    User ||--o{ NewEntity : "has many"
```

#### Step 3: Update Service Dependencies
```markdown
# Update service dependency tables
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| NewEntityService | New entity CRUD operations | createNewEntity, getNewEntityById, updateNewEntity, deleteNewEntity | NewEntityRepository, UtilityService, **EntityResolverService** |
```

## Specific Patterns for Common Changes

### 📝 **Adding New Entity (Complete Pattern)**

#### 1. Generate Domain Module
```typescript
// src/new-entity/new-entity.module.ts
@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [NewEntityService, NewEntityRepository],
  exports: [NewEntityService],
})
export class NewEntityModule {}
```

#### 2. Generate Admin Module
```typescript
// src/admin/new-entities/admin-new-entity.module.ts
@Module({
  imports: [NewEntityModule],
  controllers: [AdminNewEntityController],
  providers: [AdminNewEntityService],
  exports: [AdminNewEntityService],
})
export class AdminNewEntityModule {}
```

#### 3. Update AdminModule
```typescript
// src/admin/admin.module.ts
@Module({
  imports: [AdminUserModule, AdminClientModule, AdminMcModule, AdminNewEntityModule],
  exports: [AdminUserModule, AdminClientModule, AdminMcModule, AdminNewEntityModule],
})
export class AdminModule {}
```

#### 4. Update All Documentation Files

**ARCHITECTURE.md**:
```markdown
## Domain Modules
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewEntityModule | New entity management | NewEntityService | PrismaModule, UtilityModule |

## Admin Modules
| Module | Purpose | Controller | Service | Domain Dependency |
|--------|---------|------------|---------|-------------------|
| AdminNewEntityModule | Admin new entity operations | AdminNewEntityController | AdminNewEntityService | NewEntityModule |

## Services
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| NewEntityService | New entity CRUD operations | createNewEntity, getNewEntityById, updateNewEntity, deleteNewEntity | NewEntityRepository, UtilityService |
| AdminNewEntityService | Admin new entity operations | createNewEntity, getNewEntityById, updateNewEntity, deleteNewEntity, getNewEntities | NewEntityService |

## API Endpoints
### New Entities (`/admin/new-entities`)
- `GET /admin/new-entities` - List new entities (paginated)
- `POST /admin/new-entities` - Create new entity
- `GET /admin/new-entities/:uid` - Get new entity by UID
- `PUT /admin/new-entities/:uid` - Update new entity
- `DELETE /admin/new-entities/:uid` - Soft delete new entity
```

**MODULE_DIAGRAMS.md**:
```mermaid
# Update high-level architecture
graph TB
    Admin --> AdminNew[AdminNewEntityModule]
    AdminNew --> New[NewEntityModule]
    New --> Prisma[PrismaModule]
    New --> Utility[UtilityModule]

# Update detailed dependencies
AdminModule --> AdminNewEntityModule
AdminNewEntityModule --> NewEntityModule
NewEntityModule --> PrismaModule
NewEntityModule --> UtilityModule

# Update entity relationships
erDiagram
    NewEntity {
        int id PK
        string uid UK
        string name
        json metadata
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
```

**QUICK_REFERENCE.md**:
```markdown
## Core Modules
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewEntityModule | New entity management | NewEntityService | PrismaModule, UtilityModule |

## Domain Services
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| NewEntityService | New entity CRUD operations | createNewEntity, getNewEntityById, updateNewEntity, deleteNewEntity | NewEntityRepository, UtilityService |

## API Endpoints
### New Entities (`/admin/new-entities`)
- `GET /admin/new-entities` - List new entities (paginated)
- `POST /admin/new-entities` - Create new entity
- `GET /admin/new-entities/:uid` - Get new entity by UID
- `PUT /admin/new-entities/:uid` - Update new entity
- `DELETE /admin/new-entities/:uid` - Soft delete new entity

## Data Format Quick Reference
### Input Format (snake_case)
```typescript
// New Entity
{
  name: string;
  metadata?: Record<string, unknown>;
}
```
```

### 🔄 **Modifying Existing Services**

#### 1. Update Service Code
```typescript
// Add new method
async searchEntities(searchDto: SearchEntityDto): Promise<PaginatedResponse<Entity>> {
  // Implementation
}
```

#### 2. Update Documentation
```markdown
# Update service tables
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| EntityService | Entity CRUD operations | createEntity, getEntityById, updateEntity, deleteEntity, **searchEntities** | EntityRepository, UtilityService |
```

#### 3. Update API Endpoints
```markdown
### Entities (`/admin/entities`)
- `GET /admin/entities` - List entities (paginated)
- `POST /admin/entities` - Create entity
- `GET /admin/entities/:uid` - Get entity by UID
- `PUT /admin/entities/:uid` - Update entity
- `DELETE /admin/entities/:uid` - Soft delete entity
- `POST /admin/entities/search` - **Search entities** (NEW)
```

## Validation Checklist for AI Assistants

### ✅ **After Generating Code**

#### Code Validation
- [ ] **TypeScript Compilation**: All code compiles without errors
- [ ] **Linting**: All code passes ESLint checks
- [ ] **Import Statements**: All imports are correct and exist
- [ ] **Method Signatures**: All method signatures are properly typed

#### Documentation Validation
- [ ] **Module Names**: All module names match actual implementations
- [ ] **Service Names**: All service names match actual implementations
- [ ] **Method Names**: All method names match actual implementations
- [ ] **Dependencies**: All dependencies are correctly listed

#### Diagram Validation
- [ ] **Mermaid Syntax**: All diagrams use correct Mermaid syntax
- [ ] **Module References**: All module references in diagrams exist
- [ ] **Dependency Arrows**: All dependency arrows point to existing modules
- [ ] **Service Relationships**: Service dependency relationships are accurate

#### Cross-Reference Validation
- [ ] **Consistent Naming**: Names are consistent across all documentation
- [ ] **Complete Coverage**: All new components are documented
- [ ] **Accurate Examples**: All code examples match actual implementations
- [ ] **Valid Links**: All internal links work correctly

### 🧪 **Testing Documentation**

#### Manual Testing
- [ ] **Follow Examples**: Use documentation examples to perform tasks
- [ ] **Verify Endpoints**: Test documented API endpoints
- [ ] **Check Imports**: Verify import statements work
- [ ] **Validate Patterns**: Ensure patterns match actual usage

#### Automated Validation
- [ ] **Mermaid Rendering**: All diagrams render correctly
- [ ] **Markdown Syntax**: All markdown is valid
- [ ] **TypeScript Examples**: All TypeScript examples compile
- [ ] **JSON Examples**: All JSON examples are valid

## Common Mistakes to Avoid

### ❌ **Documentation Mistakes**

1. **Inconsistent Naming**
   - Using different names for the same module/service
   - Mixing camelCase and snake_case inappropriately
   - Inconsistent pluralization (entity vs entities)

2. **Outdated Examples**
   - Code examples that don't match current implementation
   - Import statements that don't work
   - Method signatures that are incorrect

3. **Missing Updates**
   - Forgetting to update all relevant documentation files
   - Not updating diagrams when dependencies change
   - Missing new API endpoints in documentation

4. **Incorrect Dependencies**
   - Wrong dependency arrows in diagrams
   - Incorrect dependency lists in tables
   - Missing dependencies in service documentation

### ✅ **Best Practices**

1. **Consistent Updates**
   - Update all documentation files together
   - Use consistent naming across all files
   - Maintain consistent formatting

2. **Accurate Examples**
   - Test all code examples before including them
   - Use actual method signatures from implementation
   - Include realistic data in examples

3. **Complete Coverage**
   - Document all new modules, services, and endpoints
   - Update all relevant diagrams and tables
   - Include all necessary dependencies

4. **Validation**
   - Always validate documentation after updates
   - Test all examples and links
   - Verify diagram accuracy

## Summary

When generating code for the Eridu Services API:

1. **Always update documentation** alongside code changes
2. **Use consistent naming** across all files
3. **Test all examples** before including them
4. **Validate all diagrams** for accuracy
5. **Update all relevant files** (ARCHITECTURE.md, MODULE_DIAGRAMS.md, QUICK_REFERENCE.md)
6. **Follow established patterns** for consistency
7. **Verify cross-references** are accurate

This ensures that documentation remains a reliable source of truth for the system architecture and implementation details.
