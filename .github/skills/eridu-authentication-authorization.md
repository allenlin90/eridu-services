# Eridu Services - Authentication & Authorization Skill

Provides guidance for implementing authentication and authorization in Eridu Services.

## Global Authentication

### JWT Authentication Guard (Global)

**Automatic on all endpoints via `@eridu/auth-sdk`**:

```typescript
@Controller('me/shows')
export class ShowsController {
  @Get()
  async getShows(@CurrentUser() user: AuthenticatedUser) {
    // JWT validation is automatic (global guard)
    // user contains: ext_id, id, name, email, image, payload
    return this.showsService.getShowsByMcUser(user.ext_id);
  }
}
```

**Key Points**:

- ✅ JWT authentication is automatic on all endpoints
- ✅ Use `@CurrentUser()` to access authenticated user data
- ✅ Use `user.ext_id` for database lookups
- ✅ No need to add `@UseGuards()` - guard is global
- ❌ Never manually validate JWTs in services

### Public Endpoints (No Authentication)

**Skip authentication with `@Public()` decorator**:

```typescript
import { Public } from '@/lib/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  liveness() {
    return { status: 'ok' };
  }
}
```

## Admin Authorization

### Admin-Protected Endpoints

**Require authenticated admin user**:

```typescript
@Controller('admin/users')
@AdminProtected() // All endpoints require admin
export class AdminUserController {
  @Post()
  async createUser(@Body() body: CreateUserDto) {
    // Only authenticated admin users can access
  }
}
```

**Or individual routes**:

```typescript
@Post()
@AdminProtected()
async createUser(@Body() body: CreateUserDto) {
  // Only this endpoint requires admin access
}
```

**Admin Verification**:

```typescript
// AdminGuard checks isSystemAdmin=true flag
// If admin, request proceeds; otherwise returns 403 Forbidden
```

**Key Rules**:

- ✅ Use `@AdminProtected()` on write operations
- ✅ Use `@AdminProtected()` on sensitive read operations
- ✅ AdminGuard checks `isSystemAdmin` flag on User model
- ❌ Never skip admin check on write operations
- ❌ Don't use on user-scoped endpoints

## Service-to-Service Authentication

### Google Sheets API Key

**For Google Sheets integration**:

```typescript
import { GoogleSheets } from '@/lib/decorators/google-sheets.decorator';

@Controller('google-sheets/schedules')
@GoogleSheets() // API key authentication
export class GoogleSheetsScheduleController {
  @Post()
  async createSchedule(@Request() req, @Body() data: CreateScheduleDto) {
    // req.service.serviceName === 'google-sheets'
    // API key validated automatically
  }
}
```

**Configuration**:

```env
GOOGLE_SHEETS_API_KEY=your-generated-api-key-here
```

### Backdoor API Key

**For service-to-service operations (user creation, memberships)**:

```typescript
import { Backdoor } from '@/lib/decorators/backdoor.decorator';
import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';

@Controller('backdoor/users')
@Backdoor() // API key authentication
export class BackdoorUserController extends BaseBackdoorController {
  @Post()
  async createUser(@Body() body: CreateUserDto) {
    // req.service.serviceName === 'backdoor'
    // API key validated automatically
  }

  @Post('studio-memberships')
  async createMembership(@Body() body: CreateMembershipDto) {
    // Backdoor endpoints for privileged operations
  }
}
```

**Configuration**:

```env
BACKDOOR_API_KEY=your-generated-api-key-here
```

**Protected Endpoints**:

- `POST /backdoor/users` - Create user
- `PATCH /backdoor/users/:id` - Update user
- `POST /backdoor/studio-memberships` - Create studio membership
- `POST /backdoor/auth/jwks/refresh` - Refresh JWKS cache

**Key Rules**:

- ✅ Use separate `/backdoor/*` endpoints for privileged operations
- ✅ Extend `BaseBackdoorController` for consistency
- ✅ Use `@Backdoor()` decorator for API key auth
- ❌ Never expose user creation via `/admin/*` endpoints
- ❌ Don't mix JWT and API key authentication on same endpoint

## Authentication Flow

### JWT Validation Flow

```
1. Client sends request with JWT token in Authorization header
2. JwtAuthGuard (global) validates token
   ├─ Checks for @Public() decorator (skip if present)
   ├─ Checks for @Backdoor() or @GoogleSheets() decorator (skip if present)
   └─ Validates JWT using cached JWKS from eridu_auth
3. If valid, extracts user info and attaches to request
4. Downstream guards/decorators run (@AdminProtected, etc.)
5. Controller receives request with user context
```

### Admin Authorization Flow

```
1. Endpoint has @AdminProtected() decorator
2. AdminGuard runs (global, opt-in via decorator)
   ├─ Loads user from database by ext_id
   └─ Checks isSystemAdmin=true flag
3. If admin, proceeds to controller
4. If not admin, returns 403 Forbidden
```

## Module Registration

**Guards are registered globally in app.module.ts**:

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global JWT authentication
    },
    {
      provide: APP_GUARD,
      useClass: BackdoorApiKeyGuard, // API key auth (opt-in)
    },
    {
      provide: APP_GUARD,
      useClass: GoogleSheetsApiKeyGuard, // API key auth (opt-in)
    },
    {
      provide: APP_GUARD,
      useClass: AdminGuard, // Admin check (opt-in)
    },
  ],
})
export class AppModule {}
```

## Authenticated User Context

### Accessing User Data

```typescript
@Controller('me/profile')
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // user properties:
    // - ext_id: string (external ID from SSO)
    // - id: string (UID from database)
    // - name: string
    // - email: string
    // - image?: string
    // - payload: unknown (full JWT payload)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
```

### Using ext_id for Database Lookups

```typescript
@Controller('me/shows')
export class ShowsController {
  @Get()
  async getShows(@CurrentUser() user: AuthenticatedUser) {
    // Use ext_id to find MC profile in database
    const mc = await this.mcRepository.findByUserId(user.ext_id);

    if (!mc) {
      throw HttpError.notFound('MC profile');
    }

    return this.showService.getShowsByMc(mc.uid);
  }
}
```

## Authorization Patterns

### User-Scoped Endpoints (No Admin Required)

```typescript
@Controller('me')
export class MeController {
  // No @AdminProtected() needed
  // JWT authentication is automatic

  @Get()
  @ZodSerializerDto(UserDto)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getUserById(user.ext_id);
  }

  @Patch()
  @ZodSerializerDto(UserDto)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateUser(user.ext_id, body);
  }
}
```

### Admin-Only Endpoints

```typescript
@Controller('admin')
export class AdminController {
  // All endpoints require admin

  @Get('users')
  @AdminProtected()
  async listUsers(@Query() query: PaginationQueryDto) {
    return this.userService.listUsers(query);
  }

  @Post('users')
  @AdminProtected()
  async createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }
}
```

### Service-to-Service Endpoints

```typescript
@Controller('google-sheets')
@GoogleSheets() // API key authentication only
export class GoogleSheetsController {
  // No @AdminProtected() - uses API key auth instead
  // No JWT validation - skipped due to @GoogleSheets()

  @Post('schedules')
  async createSchedules(@Body() data: CreateScheduleDto) {
    return this.scheduleService.createSchedules(data);
  }
}
```

## Related Skills

- **eridu-controller-pattern.md** - Using decorators in controllers
- **eridu-service-pattern.md** - Services receive authenticated context
- **docs/AUTHENTICATION_GUIDE.md** - Detailed auth documentation

## Best Practices Checklist

- [ ] Use `@Public()` on public endpoints only
- [ ] Use `@AdminProtected()` on all write operations
- [ ] Use `@AdminProtected()` on sensitive read operations
- [ ] Use `@CurrentUser()` to access authenticated user
- [ ] Use `user.ext_id` for database lookups
- [ ] Use `@GoogleSheets()` for Google Sheets integration
- [ ] Use `@Backdoor()` for service-to-service operations
- [ ] Never manually validate JWTs
- [ ] Never expose JWT tokens in responses
- [ ] Configure API keys in `.env` for all guards
