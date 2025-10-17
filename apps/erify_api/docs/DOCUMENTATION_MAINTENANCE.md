# Documentation Maintenance Guide

## Overview

This guide ensures that documentation remains accurate and up-to-date whenever code changes are made. It provides a systematic approach to maintaining documentation consistency across all architectural changes.

## Documentation Update Checklist

### 🔄 **When to Update Documentation**

- ✅ **New modules added**
- ✅ **Module dependencies changed**
- ✅ **New services created**
- ✅ **Service methods added/modified**
- ✅ **New repositories added**
- ✅ **API endpoints added/modified**
- ✅ **Entity relationships changed**
- ✅ **New utilities or decorators added**
- ✅ **Configuration changes**
- ✅ **Database schema changes**

### 📋 **Pre-Change Documentation Tasks**

Before making any code changes:

1. **Identify Impact Scope**
   - [ ] List all modules that will be affected
   - [ ] Identify all services that will change
   - [ ] Note any new API endpoints
   - [ ] Check for entity relationship changes

2. **Document Current State**
   - [ ] Take screenshots of current diagrams (if needed)
   - [ ] Note current module dependencies
   - [ ] Document current API endpoints

### 📝 **During Development Documentation Tasks**

While implementing changes:

1. **Update Module Dependencies**
   - [ ] Update `ARCHITECTURE.md` module tables
   - [ ] Update `QUICK_REFERENCE.md` module reference
   - [ ] Update Mermaid diagrams in `MODULE_DIAGRAMS.md`

2. **Update Service Documentation**
   - [ ] Add new services to service tables
   - [ ] Update service method lists
   - [ ] Update dependency relationships

3. **Update API Documentation**
   - [ ] Add new endpoints to endpoint lists
   - [ ] Update request/response examples
   - [ ] Update data format specifications

### ✅ **Post-Change Documentation Tasks**

After implementing changes:

1. **Verify Diagram Accuracy**
   - [ ] Check all Mermaid diagrams render correctly
   - [ ] Verify module dependency arrows point to correct modules
   - [ ] Ensure service dependency relationships are accurate

2. **Update Code Examples**
   - [ ] Verify code examples match current implementation
   - [ ] Update import statements in examples
   - [ ] Check method signatures in examples

3. **Cross-Reference Validation**
   - [ ] Ensure all module names are consistent across documents
   - [ ] Verify service names match actual implementations
   - [ ] Check endpoint paths are correct

## Detailed Update Procedures

### 🏗️ **Adding a New Module**

#### Step 1: Update Architecture Documentation
```markdown
# In ARCHITECTURE.md

## Domain Modules
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewModule | New entity management | NewService | PrismaModule, UtilityModule |

## Admin Modules
| Module | Purpose | Controller | Service | Domain Dependency |
|--------|---------|------------|---------|-------------------|
| AdminNewModule | Admin new entity operations | AdminNewController | AdminNewService | NewModule |
```

#### Step 2: Update Mermaid Diagrams
```mermaid
# Add to MODULE_DIAGRAMS.md
graph TB
    Admin --> AdminNew[AdminNewModule]
    AdminNew --> New[NewModule]
    New --> Prisma[PrismaModule]
    New --> Utility[UtilityModule]
```

#### Step 3: Update Quick Reference
```markdown
# In QUICK_REFERENCE.md

## Core Modules
| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| NewModule | New entity management | NewService | PrismaModule, UtilityModule |

## API Endpoints
### New Entity (`/admin/news`)
- `GET /admin/news` - List new entities (paginated)
- `POST /admin/news` - Create new entity
- `GET /admin/news/:uid` - Get new entity by UID
- `PUT /admin/news/:uid` - Update new entity
- `DELETE /admin/news/:uid` - Soft delete new entity
```

### 🔧 **Modifying Service Methods**

#### Step 1: Update Service Tables
```markdown
# In ARCHITECTURE.md and QUICK_REFERENCE.md

| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| UserService | User CRUD operations | createUser, getUserByUid, updateUser, deleteUser, **newMethod** | UserRepository, UtilityService |
```

#### Step 2: Update Code Examples
```typescript
// Update examples to reflect new method signatures
const result = await userService.newMethod(uid, data);
```

### 🌐 **Adding New API Endpoints**

#### Step 1: Update Endpoint Lists
```markdown
# In ARCHITECTURE.md and QUICK_REFERENCE.md

### Users (`/admin/users`)
- `GET /admin/users` - List users (paginated)
- `POST /admin/users` - Create user
- `GET /admin/users/:uid` - Get user by UID
- `PUT /admin/users/:uid` - Update user
- `DELETE /admin/users/:uid` - Soft delete user
- `GET /admin/users/search` - **Search users** (NEW)
```

#### Step 2: Update Data Format Examples
```json
// Add new request/response examples
{
  "search_query": "john",
  "filters": {
    "is_active": true
  }
}
```

### 🔗 **Changing Entity Relationships**

#### Step 1: Update Entity Relationship Diagram
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

#### Step 2: Update Service Dependencies
```markdown
# Update service dependency tables
| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| NewService | New entity CRUD operations | createNew, getNewById, updateNew, deleteNew | NewRepository, UtilityService, **EntityResolverService** |
```

## Automated Documentation Validation

### 🔍 **Documentation Validation Checklist**

#### Module Documentation Validation
- [ ] All modules listed in `ARCHITECTURE.md` exist in codebase
- [ ] All module dependencies are accurate
- [ ] All module exports are listed correctly
- [ ] Module import statements match documentation

#### Service Documentation Validation
- [ ] All services listed exist in codebase
- [ ] Service method signatures match documentation
- [ ] Service dependencies are accurate
- [ ] Service exports are correctly documented

#### API Documentation Validation
- [ ] All endpoints listed exist in controllers
- [ ] HTTP methods match actual implementations
- [ ] Request/response examples are valid
- [ ] Data format specifications match schemas

#### Diagram Validation
- [ ] All Mermaid diagrams render without errors
- [ ] Module dependency arrows point to existing modules
- [ ] Service dependency relationships are accurate
- [ ] Entity relationships match database schema

### 🛠️ **Validation Commands**

```bash
# Validate Mermaid diagrams
npx @mermaid-js/mermaid-cli -i docs/MODULE_DIAGRAMS.md -o docs/diagrams/

# Check for broken links in documentation
npx markdown-link-check docs/*.md

# Validate TypeScript imports match documentation
npx tsc --noEmit --skipLibCheck
```

## Documentation Maintenance Workflow

### 📅 **Regular Maintenance Tasks**

#### Weekly Tasks
- [ ] Review recent code changes for documentation impact
- [ ] Update any outdated examples
- [ ] Check for new modules/services that need documentation

#### Monthly Tasks
- [ ] Full review of all documentation accuracy
- [ ] Update architecture diagrams if needed
- [ ] Validate all code examples still work
- [ ] Check for consistency across all documents

#### Before Major Releases
- [ ] Complete documentation audit
- [ ] Update all diagrams and tables
- [ ] Verify all API endpoints are documented
- [ ] Review and update troubleshooting guides

### 🔄 **Change Management Process**

#### 1. **Before Making Changes**
```bash
# Create documentation branch
git checkout -b docs/update-for-[feature-name]

# Document current state
echo "Current state before changes:" > docs/CHANGELOG.md
git log --oneline -5 >> docs/CHANGELOG.md
```

#### 2. **During Development**
```bash
# Update documentation as you code
# Don't wait until the end - update docs incrementally
```

#### 3. **After Implementation**
```bash
# Validate all documentation
npm run docs:validate

# Commit documentation changes
git add docs/
git commit -m "docs: update documentation for [feature-name]"
```

## Documentation Quality Standards

### 📊 **Quality Metrics**

#### Completeness
- [ ] All modules documented
- [ ] All services documented
- [ ] All API endpoints documented
- [ ] All major utilities documented

#### Accuracy
- [ ] Code examples work without modification
- [ ] Module dependencies are correct
- [ ] Service method signatures match
- [ ] API endpoints return documented responses

#### Consistency
- [ ] Naming conventions consistent across docs
- [ ] Formatting consistent across all files
- [ ] Cross-references are accurate
- [ ] Diagrams match implementation

#### Usability
- [ ] Clear navigation structure
- [ ] Easy to find information
- [ ] Examples are practical and helpful
- [ ] Troubleshooting guides are comprehensive

### 🎯 **Documentation Review Criteria**

#### Technical Accuracy
- [ ] All technical details are correct
- [ ] Code examples compile and run
- [ ] API specifications match implementation
- [ ] Database schema matches documentation

#### Clarity and Readability
- [ ] Language is clear and concise
- [ ] Examples are well-explained
- [ ] Diagrams are easy to understand
- [ ] Structure is logical and intuitive

#### Completeness
- [ ] All necessary information is included
- [ ] No missing steps in procedures
- [ ] All edge cases are covered
- [ ] References are complete

## Emergency Documentation Updates

### 🚨 **When Documentation is Out of Sync**

#### Immediate Actions
1. **Identify the Gap**
   - [ ] What changed in the code?
   - [ ] What documentation is now incorrect?
   - [ ] What are the immediate impacts?

2. **Quick Fixes**
   - [ ] Update critical diagrams
   - [ ] Fix broken code examples
   - [ ] Correct API endpoint documentation

3. **Comprehensive Update**
   - [ ] Schedule full documentation review
   - [ ] Update all affected sections
   - [ ] Validate all changes

#### Prevention Strategies
- [ ] Include documentation updates in code review process
- [ ] Set up automated checks for documentation accuracy
- [ ] Regular documentation maintenance schedule
- [ ] Developer training on documentation importance

## Tools and Automation

### 🔧 **Recommended Tools**

#### Documentation Generation
```bash
# Generate API documentation from OpenAPI specs
npx @redocly/cli build-docs api-spec.yaml

# Generate Mermaid diagrams from code
npx @mermaid-js/mermaid-cli -i docs/source/ -o docs/generated/
```

#### Validation Tools
```bash
# Check markdown syntax
npx markdownlint docs/*.md

# Validate links
npx markdown-link-check docs/*.md

# Check spelling
npx cspell "docs/**/*.md"
```

#### Automation Scripts
```bash
# docs/scripts/validate-docs.sh
#!/bin/bash
echo "Validating documentation..."

# Check Mermaid diagrams
npx @mermaid-js/mermaid-cli -i docs/MODULE_DIAGRAMS.md -o /tmp/diagrams/

# Validate markdown
npx markdownlint docs/*.md

# Check links
npx markdown-link-check docs/*.md

echo "Documentation validation complete!"
```

## Conclusion

Maintaining accurate and up-to-date documentation is crucial for:

- **Developer Onboarding**: New team members can understand the system quickly
- **System Maintenance**: Existing developers can reference accurate information
- **Code Quality**: Documentation serves as a living specification
- **Team Collaboration**: Shared understanding of system architecture

By following this guide systematically, we ensure that documentation remains a reliable source of truth for the Eridu Services API architecture and implementation details.

---

**Remember**: Documentation is not a one-time task but an ongoing responsibility that should be integrated into the development workflow.
