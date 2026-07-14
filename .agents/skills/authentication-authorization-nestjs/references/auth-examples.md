# Authentication & Authorization Examples

Detailed code examples for backend and frontend auth patterns.

## Backend: Token Validation

```typescript
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { JwtAuthGuard } from '@/lib/auth/jwt-auth.guard';

@Controller('me/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getUserById(user.id);
  }
}
```

## Backend: Studio-Scoped Authorization

```typescript
import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';

@Controller('studios/:studioId/tasks')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MEMBER])
export class StudioTaskController {
  // Only studio members can access
}
```

## Backend: Service-to-Service

```typescript
import { ApiKeyGuard } from '@/lib/auth/api-key.guard';

@Controller('backdoor/users')
@UseGuards(ApiKeyGuard)
export class BackdoorUserController {
  // Only services with valid API key can access
}
```

## Frontend: Protected Routes

```typescript
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { SessionProvider, useSession } from '@/lib/session-provider';

function AuthenticatedLayout() {
  const { session, isLoading } = useSession();
  if (isLoading) return <LoadingSpinner />;
  if (!session) {
    authClient.redirectToLogin();
    return null;
  }
  return <Outlet />;
}
```

## Common Mistakes with Fixes

### Trusting user ID from body
```typescript
// ❌ Wrong
@Post('update-profile')
async updateProfile(@Body() body: { userId: string; name: string }) {
  return this.userService.updateUser(body.userId, { name: body.name });
}

// ✅ Correct
@Post('me/profile')
async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: { name: string }) {
  return this.userService.updateUser(user.id, { name: body.name });
}
```

### Not checking backend authorization
```typescript
// ❌ Wrong — frontend-only protection
@Get('admin/users')
async listUsers() { return this.userService.listUsers(); }

// ✅ Correct — backend enforces
@Get('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
async listUsers() { return this.userService.listUsers(); }
```
