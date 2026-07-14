# Planned RBAC Patterns

> **CAUTION**: These patterns are PLANNED — not yet implemented. The `roles` and `permissions` JSONB fields do NOT currently exist on the User model. The current AdminGuard only checks `isSystemAdmin`. Do NOT use this code without first adding schema migrations.

## Database Schema (Planned)

```prisma
model User {
  isSystemAdmin  Boolean  @default(false)  // Full access bypass
  roles          Json     @default("[]")   // ["content_manager", "analyst"]
  permissions    Json     @default("[]")   // ["users:read", "custom:feature"]
}
```

## Permission Format

Use `module:action` format: `users:read`, `users:write`, `shows:read`, `reports:export`.

## Role Definitions

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  content_manager: ['shows:read', 'shows:write', 'schedules:read', 'schedules:write'],
  analyst: ['users:read', 'shows:read', 'reports:read'],
  support: ['users:read', 'tickets:read', 'tickets:write'],
  system_manager: ['*:*'],
};
```

Effective permissions = Role permissions + Custom permissions.

## AdminGuard Pattern (Planned)

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) || [];

    const user = await this.userService.getUserByExtId(request.user.ext_id);

    // 1. System admin bypasses all checks
    if (user.isSystemAdmin)
      return true;

    // 2. Expand roles to permissions
    const userRoles = (user.roles as string[]) || [];
    const rolePermissions = userRoles.flatMap((role) => this.ROLE_PERMISSIONS[role] || []);

    // 3. Combine with custom permissions
    const customPermissions = (user.permissions as string[]) || [];
    const effectivePermissions = [...new Set([...rolePermissions, ...customPermissions])];

    // 4. Check required permissions
    return requiredPermissions.every((req) => effectivePermissions.includes(req));
  }
}
```

## Controller Pattern (Planned)

```typescript
@Controller('admin/users')
export class AdminUserController {
  @AdminProtected('users:read')
  @Get()
  getUsers() { ... }

  @AdminProtected('users:write')
  @Post()
  createUser() { ... }

  @AdminProtected(['users:read', 'users:write'])
  @Patch(':id')
  updateUser() { ... }
}
```

## Frontend Integration (Planned)

Expose effective permissions via `/me` endpoint for UI permission checks.
