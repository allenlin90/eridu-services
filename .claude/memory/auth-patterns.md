# Authentication & Authorization Patterns

## Multi-Service Auth Architecture

### 1. eridu_auth (Auth Service)
- Issues JWT tokens (15min expiration)
- Manages sessions in PostgreSQL (Drizzle)
- Handles login/signup/verification/magic-links
- Exposes `/api/auth/*` endpoints
- Sets HTTP-only cookies (`eridu_auth_session`)

### 2. erify_api (Resource Server)
- Validates JWTs via `@eridu/auth-sdk`
- Fetches JWKS from eridu_auth
- Maps `payload.id` to `User.extId` (Better Auth user ID)
- Attaches `AuthenticatedUser` to request
- Enforces role-based access

### 3. React Apps (Clients)
- Better Auth client from `@eridu/auth-sdk/client/react`
- Token caching in memory
- Axios interceptors attach Bearer token
- Auto-refresh on expiration (single retry)
- Redirect to login on auth failure

## Token Flow

```
1. User logs in → POST /api/auth/sign-in/email
2. eridu_auth issues JWT (15min) + session cookie
3. Frontend requests JWT: authClient.client.token()
4. Frontend caches JWT in memory
5. Axios interceptor attaches: Authorization: Bearer {jwt}
6. erify_api validates JWT using JWKS
7. On expiration (401), frontend refreshes token
8. If refresh fails, redirect to /login
```

## Guard Hierarchy (erify_api)

Guards are applied in order via `APP_GUARD`:

1. **ThrottlerGuard** - Rate limiting (disabled in dev)
2. **JwtAuthGuard** - JWT validation (global, all routes)
3. **BackdoorApiKeyGuard** - API key for `/backdoor/*` endpoints
4. **GoogleSheetsApiKeyGuard** - API key for `/google-sheets/*`
5. **AdminGuard** - Requires system admin role
6. **StudioGuard** - Validates studio membership + role

## Decorators

### @SkipJwtAuth()
Skip JWT validation for public endpoints.

```typescript
@Get('health')
@SkipJwtAuth()
healthCheck() { return { status: 'ok' }; }
```

### @Admin()
Require system admin role.

```typescript
@Get('users')
@Admin()
listAllUsers() { /* only admins */ }
```

### @StudioProtected([roles])
Require studio membership with specific roles.

```typescript
@Post(':studioId/tasks/generate')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
generateTasks(@StudioParam() studioUid: string) {
  // studioUid is validated by guard
  // req.studioMembership is attached
}
```

### @CurrentUser()
Inject authenticated user into request handler.

```typescript
@Get('me')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user; // { id, extId, email, isAdmin, ... }
}
```

### @StudioParam()
Extract and validate studio UID from route params.

```typescript
@Get(':studioId/shows')
@StudioProtected()
getShows(@StudioParam() studioUid: string) {
  // Guard already validated user has access to this studio
}
```

## JWT Payload Structure

```typescript
interface JwtPayload {
  id: string;          // Better Auth user ID
  name: string;
  email: string;
  image: string | null;
  organization_ids: string[];
  team_ids: string[];
  iat: number;         // Issued at
  exp: number;         // Expiration (15min)
}
```

## AuthenticatedUser (Request Context)

After JWT validation, user is attached to request:

```typescript
interface AuthenticatedUser {
  id: bigint;          // Internal DB ID
  extId: string;       // Better Auth user ID (from JWT payload.id)
  uid: string;         // Public UID (user_abc123)
  email: string;
  username: string | null;
  role: string;
  isAdmin: boolean;
}
```

## StudioMembership (Request Context)

When `@StudioProtected()` is used, membership is attached:

```typescript
interface StudioMembership {
  id: bigint;
  uid: string;
  role: string;        // 'admin' | 'manager' | 'talent_manager' | 'designer' | 'moderation_manager' | 'member'
  userId: bigint;
  studioId: bigint;
  user: User;
  studio: Studio;
}
```

### Phase 4 Role/Route Notes (current)

- Studio review queue route: `/studios/:studioId/review-queue` (replaces legacy `/tasks?status=REVIEW` route)
- Creator mapping routes (fully implemented):
  - `/studios/$studioId/creator-mapping` (mapping list with bulk assign entry point)
  - `/studios/$studioId/creator-mapping/$showId` (show-level creator add/remove)
- Creator mapping API endpoints (guarded by `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])`):
  - `GET /studios/:studioId/shows/:showId/creators`
  - `POST /studios/:studioId/shows/:showId/creators/bulk-assign`

## Guard Implementation Pattern

```typescript
// 1. JwtAuthGuard extends base guard from @eridu/auth-sdk
@Injectable()
export class JwtAuthGuard extends createJwtGuard({
  jwtVerifier: JwtVerifier,
  isPublic: (context) => {
    const skipAuth = Reflector.get('skipJwtAuth', context.getHandler());
    return !!skipAuth;
  },
  getUserFromPayload: async (payload, context) => {
    const userService = context.switchToHttp().getRequest().app.get(UserService);
    const user = await userService.findByExtId(payload.id);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  },
});

// 2. AdminGuard checks user.isAdmin
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isAdmin = Reflector.get('admin', context.getHandler());
    if (!isAdmin) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user?.isAdmin) throw new ForbiddenException('Admin access required');
    return true;
  }
}

// 3. StudioGuard validates membership + role
@Injectable()
export class StudioGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = Reflector.get('studioRoles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const studioUid = request.params.studioId;

    const membership = await studioMembershipService.findByUserAndStudio(user.id, studioUid);
    if (!membership) throw new ForbiddenException('Not a studio member');

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient studio permissions');
    }

    request.studioMembership = membership;
    return true;
  }
}
```

## Security Features

- **Short-lived JWTs**: 15min expiration reduces token theft risk
- **HTTP-only cookies**: Session cookies not accessible to JS
- **CSRF protection**: SameSite cookies
- **JWKS rotation**: Auto-refresh on key mismatch
- **Cross-domain cookies**: Enabled for subdomains (eridu.*)
- **Token refresh**: Single retry on 401, then re-login
- **Rate limiting**: ThrottlerGuard (configured per route)

## Testing Auth

### Backdoor Endpoints (Dev/Test Only)

Protected by API key (`BACKDOOR_API_KEY` env var):

```bash
# Create test user
POST /backdoor/users
X-Backdoor-Api-Key: {key}

# Create studio membership
POST /backdoor/studios/:studioId/memberships
X-Backdoor-Api-Key: {key}
```

### Manual Test Scripts

Located in `/apps/erify_api/manual-test/`:
- `auth-test.http` - Auth flow testing
- `backdoor-test.http` - User/membership creation
- `schedule-planning.http` - Complex workflows

## Common Auth Patterns

### Fetching Current User
```typescript
// Backend
@Get('me')
getMe(@CurrentUser() user: AuthenticatedUser) {
  return this.userService.findByUid(user.uid);
}

// Frontend
const { data: currentUser } = useQuery({
  queryKey: ['users', 'me'],
  queryFn: () => apiClient.get('/me'),
});
```

### Studio-Scoped Operations
```typescript
// Backend
@Post(':studioId/shows')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
createShow(
  @StudioParam() studioUid: string,
  @Body() dto: CreateShowDto,
) {
  // No need to re-validate studio access
  return this.showService.create(studioUid, dto);
}

// Frontend
const createShow = useMutation({
  mutationFn: (data) =>
    apiClient.post(`/studios/${studioId}/shows`, data),
});
```

### Conditional UI Based on Role
```typescript
// Frontend
const { data: membership } = useStudioMembership(studioId);
const canManageTasks = membership?.role === 'admin' || membership?.role === 'manager';

{canManageTasks && <Button>Generate Tasks</Button>}
```

### IDOR Protection: Route Param is Authoritative

When a client can supply a `studio_id` in the request body or query string (e.g., from a Zod DTO), always discard it and use the validated route param instead:

```typescript
// ❌ WRONG — uses client-supplied studio_id from query
const { data } = await this.service.list({ ...query });

// ✅ CORRECT — discard client value, use route param the guard already validated
const { studioId: _ignoredStudioId, ...scopedQuery } = query;
const { data } = await this.service.list({ ...scopedQuery, studioId });
```

This applies to all studio-scoped controllers, including lookup/proxy controllers.
