# Skills Linting Fixes

**Date**: 2026-02-15
**Fixed Issues**: Unsupported attributes, file:// protocol URLs

## ✅ Fixed Issues

### Issue 1: Unsupported Attributes (4 files)

**Problem**: Skills used unsupported frontmatter attributes that caused IDE linter errors:
- `priority:` ❌ Not supported
- `applies_to:` ❌ Not supported
- `supersedes:` ❌ Not supported

**Supported attributes**: name, description, argument-hint, compatibility, disable-model-invocation, license, **metadata**, user-invokable

**Solution**: Moved unsupported attributes into `metadata:` object

**Files Fixed**:
1. ✅ `.claude/skills/service-pattern-nestjs/SKILL.md`
2. ✅ `.claude/skills/repository-pattern-nestjs/SKILL.md`
3. ✅ `.claude/skills/backend-controller-pattern-nestjs/SKILL.md`
4. ✅ `.claude/skills/authentication-authorization-nestjs/SKILL.md`

**Before**:
```yaml
---
name: service-pattern-nestjs
description: ...
priority: 3
applies_to: [backend, nestjs, services]
supersedes: [service-pattern]
---
```

**After**:
```yaml
---
name: service-pattern-nestjs
description: ...
metadata:
  priority: 3
  applies_to: [backend, nestjs, services]
  supersedes: [service-pattern]
---
```

### Issue 2: File Protocol URLs (10 files)

**Problem**: Skills used `file:///Users/allenlin/Desktop/...` URLs that:
- Don't work on GitHub
- Are machine-specific
- Break when viewing skills in repositories

**Solution**: Converted to relative paths from skill directory

**Files Fixed**:
1. ✅ `.claude/skills/frontend-api-layer/SKILL.md`
2. ✅ `.claude/skills/service-pattern-nestjs/SKILL.md`
3. ✅ `.claude/skills/repository-pattern-nestjs/SKILL.md`
4. ✅ `.claude/skills/backend-controller-pattern-nestjs/SKILL.md`
5. ✅ `.claude/skills/studio-list-pattern/SKILL.md`
6. ✅ `.claude/skills/admin-list-pattern/SKILL.md`
7. ✅ `.claude/skills/frontend-testing-patterns/SKILL.md`
8. ✅ `.claude/skills/frontend-state-management/SKILL.md`
9. ✅ `.claude/skills/frontend-performance/SKILL.md`
10. ✅ `.claude/skills/frontend-error-handling/SKILL.md`

**Before**:
```markdown
[task-template.service.ts](file:///Users/allenlin/Desktop/projects/eridu-services/apps/erify_api/src/models/task-template/task-template.service.ts)
```

**After**:
```markdown
[task-template.service.ts](../../../apps/erify_api/src/models/task-template/task-template.service.ts)
```

**Path Structure**: From `.claude/skills/{skill-name}/SKILL.md` → `../../../apps/...`

## ⚠️ Remaining Issues (Separate from Linting)

### Non-Existent Canonical Example Files

Some skills reference files that don't exist in the codebase. These cause IDE warnings but are a **content issue**, not a linting issue:

**Files that don't exist**:
1. `apps/erify_studios/src/routes/_authenticated/studios/$studioId/task-templates/index.tsx` (directory doesn't exist)
2. `apps/erify_studios/src/features/task-templates/components/task-template-toolbar.tsx` (actual: `task-templates-toolbar.tsx` - plural)
3. `apps/erify_studios/src/features/task-templates/components/task-template-card.test.tsx` (test file doesn't exist)
4. `apps/erify_studios/src/features/task-templates/hooks/use-task-templates.test.ts` (test file doesn't exist)
5. `apps/erify_studios/src/components/error-boundary.tsx` (doesn't exist)
6. `apps/erify_studios/src/features/task-templates/api/task-templates.api.ts` (doesn't exist)

**This was already identified in skills-review.md as Issue #3: Unverified References**

**Recommendation**: Either:
- Create the missing files if they're intended to be canonical examples
- Update skills to reference existing files
- Remove non-existent references

## Summary

✅ **All linting issues fixed**:
- 0 files with unsupported attributes (was 4)
- 0 files with `file://` protocol URLs (was 10)

⚠️ **Content issues remain** (IDE warnings about missing files):
- 6+ canonical example files don't exist in codebase
- This is a separate issue from linting and requires content review

**Status**: Skills are now lint-clean and GitHub-compatible! 🎉
