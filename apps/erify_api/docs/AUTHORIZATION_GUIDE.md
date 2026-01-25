# Authorization Guide

## Overview

This guide documents the authorization system in `erify_api`, which provides granular, role-based access control for admin endpoints and multi-scope access patterns for different user types.

## Architecture Principles

### Separation of Concerns

- **Authentication** (`eridu_auth`): Handles user identity and JWT issuance
- **Authorization** (`erify_api`): Handles permissions and access control

This separation aligns with industry best practices (Clerk, Auth0, AWS IAM) and keeps JWTs minimal with identity claims only.

### Multi-Scope Access

Different user types have different access scopes:

| User Type           | Access Scope     | Implementation                  |
| ------------------- | ---------------- | ------------------------------- |
| **MC**              | Own shows only   | Via `ShowMC` relationship       |
| **Studio Operator** | Studio's rooms   | Via `StudioMembership`          |
| **Content Manager** | Specific clients | Via `roles` + client filtering  |
| **System Manager**  | All data         | Via `roles: ["system_manager"]` |
| **Read-only Admin** | View-only access | Via `roles: ["analyst"]`        |

## Permission Model

### User Schema

```prisma
model User {
  isSystemAdmin  Boolean  @default(false)  // Full access bypass
  roles          Json     @default("[]")   // ["content_manager", "analyst"]
  permissions    Json     @default("[]")   // ["users:read", "custom:feature"]
}
```

**Why JSONB**:
- ✅ Indexable with GIN for fast queries
- ✅ Type-safe (Prisma parses to `string[]`)
- ✅ PostgreSQL validates structure
- ✅ Supports JSONB containment operators

### Role-Based Permissions

**Roles** are predefined permission bundles:

```typescript
const ROLE_PERMISSIONS = {
  content_manager: ['shows:read', 'shows:write', 'schedules:read', 'schedules:write'],
  analyst: ['users:read', 'shows:read', 'reports:read'],
  support: ['users:read', 'tickets:read', 'tickets:write'],
  system_manager: ['*:*'], // All permissions
};
```

**Permission Format**: `module:action` (e.g., `users:read`, `shows:write`)

### Effective Permissions

Effective permissions = Role permissions + Custom permissions

**Example**:
```json
{
  "isSystemAdmin": false,
  "roles": ["content_manager"],
  "permissions": ["reports:export"]
}
```

**Effective**: `shows:read`, `shows:write`, `schedules:read`, `schedules:write`, `reports:export`

## Implementation

### AdminGuard

The `AdminGuard` enforces authorization for `/admin/*` endpoints:

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly ROLE_PERMISSIONS: Record<string, string[]> = {
    content_manager: ['shows:read', 'shows:write', 'schedules:read', 'schedules:write'],
    analyst: ['users:read', 'shows:read', 'reports:read'],
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) || [];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.userService.getUserByExtId(request.user.ext_id);

    // 1. System admin bypasses all checks
    if (user.isSystemAdmin) return true;

    // 2. Expand roles to permissions
    const userRoles = (user.roles as string[]) || [];
    const rolePermissions = userRoles.flatMap(role => this.ROLE_PERMISSIONS[role] || []);
    
    // 3. Combine with custom permissions
    const customPermissions = (user.permissions as string[]) || [];
    const effectivePermissions = [...new Set([...rolePermissions, ...customPermissions])];

    // 4. Check if user has ALL required permissions
    return requiredPermissions.every(req => effectivePermissions.includes(req));
  }
}
```

### AdminProtected Decorator

```typescript
export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

// Usage: @AdminProtected('users:read') or @AdminProtected(['users:read', 'users:write'])
export function AdminProtected(permissions: string | string[] = []) {
  return applyDecorators(
    SetMetadata(ADMIN_PERMISSIONS_KEY, Array.isArray(permissions) ? permissions : [permissions]),
    UseGuards(AdminGuard),
  );
}
```

### Controller Usage

```typescript
@Controller('admin/users')
export class AdminUserController {
  // Read-only access
  @AdminProtected('users:read')
  @Get()
  getUsers() { ... }

  // Write access
  @AdminProtected('users:write')
  @Post()
  createUser() { ... }

  // Multiple permissions required
  @AdminProtected(['users:read', 'users:write'])
  @Patch(':id')
  updateUser() { ... }
}
```

## Frontend Integration

### /me Endpoint

The `/me` endpoint exposes effective permissions to the frontend:

```typescript
@Get()
async getMe(@CurrentUser() user: AuthenticatedUser) {
  const dbUser = await this.userService.getUserByExtId(user.ext_id);
  
  // Expand roles to effective permissions
  const userRoles = (dbUser?.roles as string[]) || [];
  const rolePermissions = userRoles.flatMap(role => ROLE_PERMISSIONS[role] || []);
  const customPermissions = (dbUser?.permissions as string[]) || [];
  const effectivePermissions = [...new Set([...rolePermissions, ...customPermissions])];
  
  return {
    ...user,
    isSystemAdmin: dbUser?.isSystemAdmin ?? false,
    roles: userRoles,
    permissions: effectivePermissions,
  };
}
```

### UI Permission Checks

```typescript
// Frontend logic
const canEditUser = user.isSystemAdmin || user.permissions.includes('users:write');

return (
  <div>
    {canEditUser && <button>Edit User</button>}
  </div>
);
```

## Permission Management

### Assigning Roles

```typescript
// Assign role to user
await prisma.user.update({
  where: { id: userId },
  data: { roles: ['content_manager'] },
});
```

### Adding Custom Permissions

```typescript
// Add custom permission on top of role
await prisma.user.update({
  where: { id: userId },
  data: { 
    roles: ['analyst'],
    permissions: ['reports:export'], // Extra permission
  },
});
```

### Querying by Role (PostgreSQL)

```sql
-- Find all analysts
SELECT * FROM users WHERE roles @> '["analyst"]';

-- Find users with specific permission
SELECT * FROM users WHERE permissions @> '["reports:export"]';
```

### GIN Index (Optional)

For large user tables, add GIN indexes:

```sql
CREATE INDEX idx_users_roles ON users USING GIN (roles);
CREATE INDEX idx_users_permissions ON users USING GIN (permissions);
```

## Best Practices

### 1. Use Roles for Onboarding

✅ **Good**: Assign `roles: ["content_manager"]` (1 action)  
❌ **Bad**: Assign 50 individual permissions

### 2. Custom Permissions for Edge Cases

✅ **Good**: `roles: ["analyst"]` + `permissions: ["special:feature"]`  
❌ **Bad**: Create new role for every edge case

### 3. Granular Permission Strings

✅ **Good**: `users:read`, `users:write`, `shows:read`  
❌ **Bad**: `admin:read`, `admin:write` (too coarse)

### 4. System Admin for Full Access

✅ **Good**: `isSystemAdmin: true` (bypasses all checks)  
❌ **Bad**: `roles: ["god_mode"]` (unnecessary abstraction)

### 5. Frontend Permission Checks

✅ **Good**: Use same permission strings as backend  
❌ **Bad**: Duplicate permission logic in frontend

## Future Enhancements

### Caching (Phase 2)

Add caching layer to reduce database queries:

```typescript
@Injectable()
export class PermissionCacheService {
  private cache = new Map<string, EffectivePermissions>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  async getPermissions(userId: string): Promise<EffectivePermissions> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached;
    }
    
    const permissions = await this.resolvePermissions(userId);
    this.cache.set(userId, { ...permissions, timestamp: Date.now() });
    return permissions;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }
}
```

### ClientMembership (Phase 3)

If per-client role assignment becomes necessary:

```prisma
model ClientMembership {
  id        BigInt   @id
  userId    BigInt
  clientId  BigInt
  role      String   // "admin" | "viewer"
  user      User     @relation(...)
  client    Client   @relation(..., onDelete: Cascade)
}
```

This enables:
- User A = admin for Client X, viewer for Client Y
- Audit trail of client access grants
- Client-driven user management

## Troubleshooting

### Permission Denied (403)

1. Check user's `isSystemAdmin` flag
2. Check user's `roles` array
3. Check user's `permissions` array
4. Verify endpoint's `@AdminProtected()` requirements
5. Check `AdminGuard` logs for missing permissions

### Permissions Not Updating

1. Verify database update succeeded
2. Check if caching is enabled (invalidate cache)
3. Force token refresh (logout + login)
4. Check `/me` endpoint response

### Role Not Expanding

1. Verify role name matches `ROLE_PERMISSIONS` mapping
2. Check for typos in role name
3. Ensure `ROLE_PERMISSIONS` is defined in both `AdminGuard` and `/me` endpoint
4. Consider extracting `ROLE_PERMISSIONS` to shared constants file

## Related Documentation

- [Authentication Guide](./AUTHENTICATION_GUIDE.md) - JWT validation and authentication patterns
- [Architecture Overview](./ARCHITECTURE.md) - Module architecture and design patterns
- [Business Domain](./BUSINESS.md) - Business domain and entity relationships
