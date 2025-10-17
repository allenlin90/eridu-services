# Documentation Update Checklist Template

## For Each Code Change

### 📋 **Pre-Change Assessment**

**Change Description**: [Brief description of what's being changed]

**Impact Analysis**:
- [ ] **Modules Affected**: List all modules that will be modified
- [ ] **Services Affected**: List all services that will change
- [ ] **API Endpoints**: List any new or modified endpoints
- [ ] **Entity Relationships**: Note any database relationship changes
- [ ] **Dependencies**: List any new or changed dependencies

**Documentation Files to Update**:
- [ ] `ARCHITECTURE.md`
- [ ] `MODULE_DIAGRAMS.md`
- [ ] `QUICK_REFERENCE.md`
- [ ] `DOCUMENTATION_MAINTENANCE.md` (if process changes)

---

### 🔄 **During Development**

#### Module Changes
- [ ] **New Module Added**:
  - [ ] Add to module tables in `ARCHITECTURE.md`
  - [ ] Add to module reference in `QUICK_REFERENCE.md`
  - [ ] Update Mermaid diagrams in `MODULE_DIAGRAMS.md`
  - [ ] Add module dependencies and exports

- [ ] **Module Dependencies Changed**:
  - [ ] Update dependency arrows in diagrams
  - [ ] Update module dependency tables
  - [ ] Verify import statements in examples

#### Service Changes
- [ ] **New Service Added**:
  - [ ] Add to service tables in both documentation files
  - [ ] List key methods and dependencies
  - [ ] Update service dependency diagrams
  - [ ] Add code examples if applicable

- [ ] **Service Methods Modified**:
  - [ ] Update method signatures in documentation
  - [ ] Update code examples to match new signatures
  - [ ] Verify dependency relationships still accurate

#### API Changes
- [ ] **New Endpoints Added**:
  - [ ] Add to endpoint lists in both files
  - [ ] Document request/response formats
  - [ ] Add example requests and responses
  - [ ] Update controller-to-service mapping

- [ ] **Endpoint Modifications**:
  - [ ] Update endpoint documentation
  - [ ] Verify request/response examples still valid
  - [ ] Update any affected code examples

#### Entity/Relationship Changes
- [ ] **New Entity Added**:
  - [ ] Update entity relationship diagrams
  - [ ] Add entity to data format examples
  - [ ] Update repository documentation
  - [ ] Add CRUD operation examples

- [ ] **Relationship Changes**:
  - [ ] Update entity relationship diagrams
  - [ ] Update service dependency documentation
  - [ ] Verify UID resolution examples still accurate

---

### ✅ **Post-Change Validation**

#### Documentation Accuracy
- [ ] **Code Examples**: All code examples compile and run
- [ ] **Module Names**: All module names match actual implementations
- [ ] **Service Names**: All service names match actual implementations
- [ ] **Method Signatures**: All method signatures are accurate
- [ ] **API Endpoints**: All endpoints return documented responses

#### Diagram Validation
- [ ] **Mermaid Diagrams**: All diagrams render without errors
- [ ] **Dependency Arrows**: All arrows point to existing modules
- [ ] **Service Relationships**: Service dependencies are accurate
- [ ] **Entity Relationships**: Database relationships match documentation

#### Cross-Reference Validation
- [ ] **Consistent Naming**: Module/service names consistent across all docs
- [ ] **Accurate References**: All cross-references point to correct sections
- [ ] **Complete Coverage**: All new components are documented
- [ ] **No Orphaned References**: No references to removed components

---

### 🧪 **Testing Documentation**

#### Manual Testing
- [ ] **Follow Quick Reference**: Use quick reference to perform common tasks
- [ ] **Test Code Examples**: Run all code examples to ensure they work
- [ ] **Verify API Endpoints**: Test documented endpoints return expected responses
- [ ] **Check Module Imports**: Verify import statements work correctly

#### Automated Validation
- [ ] **Mermaid Rendering**: Run Mermaid validation on all diagrams
- [ ] **Markdown Syntax**: Check markdown syntax is valid
- [ ] **Link Validation**: Verify all internal links work
- [ ] **TypeScript Compilation**: Ensure all TypeScript examples compile

---

### 📝 **Documentation Update Log**

**Date**: [Date of change]
**Developer**: [Developer name]
**Change Type**: [New feature/Bug fix/Refactor/etc.]

**Files Modified**:
- [ ] `ARCHITECTURE.md` - [Brief description of changes]
- [ ] `MODULE_DIAGRAMS.md` - [Brief description of changes]
- [ ] `QUICK_REFERENCE.md` - [Brief description of changes]

**Validation Results**:
- [ ] All diagrams render correctly
- [ ] All code examples work
- [ ] All API endpoints documented
- [ ] Cross-references accurate

**Notes**: [Any additional notes or considerations]

---

## Quick Reference for Common Changes

### Adding a New Entity (User, Client, MC, etc.)

**Required Documentation Updates**:
1. **Domain Module**:
   - Add to module tables
   - Add service documentation
   - Add repository documentation
   - Update dependency diagrams

2. **Admin Module**:
   - Add admin module documentation
   - Add controller documentation
   - Add admin service documentation
   - Update API endpoint lists

3. **Data Formats**:
   - Add input format example
   - Add output format example
   - Update schema documentation

4. **Diagrams**:
   - Update module dependency diagram
   - Update service dependency diagram
   - Update entity relationship diagram
   - Update API endpoint structure diagram

### Modifying Service Methods

**Required Documentation Updates**:
1. **Service Tables**: Update method lists and signatures
2. **Code Examples**: Update examples to match new signatures
3. **API Documentation**: Update if endpoints changed
4. **Dependency Documentation**: Update if dependencies changed

### Adding New API Endpoints

**Required Documentation Updates**:
1. **Endpoint Lists**: Add to all relevant endpoint lists
2. **Request/Response Examples**: Add format examples
3. **Controller Documentation**: Update controller mapping
4. **Service Documentation**: Update if service methods changed

### Changing Module Dependencies

**Required Documentation Updates**:
1. **Module Tables**: Update dependency lists
2. **Mermaid Diagrams**: Update dependency arrows
3. **Import Examples**: Update code examples
4. **Architecture Description**: Update architectural explanations

---

## Emergency Documentation Fixes

### When Documentation is Broken

**Immediate Actions**:
1. **Identify the Issue**: What's wrong and what caused it?
2. **Quick Fix**: Make minimal changes to restore functionality
3. **Comprehensive Fix**: Schedule full documentation review
4. **Prevention**: Update process to prevent recurrence

**Common Issues and Fixes**:
- **Broken Mermaid Diagrams**: Check syntax, fix arrows, verify module names
- **Outdated Code Examples**: Update imports, fix method signatures
- **Missing API Endpoints**: Add to endpoint lists, document formats
- **Incorrect Dependencies**: Update module tables, fix diagrams

---

**Remember**: Documentation is a living part of the codebase. Keep it updated with every change to maintain its value as a reliable source of truth.
