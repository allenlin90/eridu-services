# Secure Coding Practices — Detailed References

Extended code examples for each security rule.

## Input Validation — Zod at Every Boundary
```typescript
// ✅ Body validated via @ZodBody() or NestJS Pipes
@Post()
create(@Body() dto: CreateShowDto) { ... }

// ❌ Raw body access bypasses Zod
@Post()
create(@Req() req: Request) { const name = req.body.name; }

// Path params: always use UidValidationPipe
@Get(':showId')
findOne(@Param('showId', UidValidationPipe) showUid: string) { ... }
```

## SQL Injection — Prisma Parameterisation
```typescript
// ✅ Safe — Prisma.sql parameterises values
const rows = await prisma.$queryRaw<Row[]>(
  Prisma.sql`SELECT * FROM shows WHERE studio_id = ${studioId}`,
);

// ❌ SQL injection risk — string concatenation
const rows = await prisma.$queryRaw<Row[]>(
  `SELECT * FROM shows WHERE studio_id = ${studioId}`,
);

// ✅ Safe IN clause
Prisma.sql`WHERE id IN (${Prisma.join(ids)})`
```

## Authorization — Studio Scoping
```typescript
// ✅ Studio UID included in every query
const template = await this.repository.findOne({
  uid: templateUid,
  studio: { uid: studioUid },  // ← Prevents cross-studio access
});

// ❌ Only UID checked — another studio's template could match
const template = await this.repository.findOne({ uid: templateUid });
```

## Custom Throttler Guard
```typescript
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = (req as Request).user as AuthenticatedUser | undefined;
    const ip = (req as Request).ip ?? 'unknown';
    const userId = user?.ext_id ?? 'anonymous';
    return `${userId}:${ip}`;
  }
}
```

### Trust Proxy Hardening
| Setting | Behavior | Risk |
|---|---|---|
| `true` | Trusts all `X-Forwarded-For` entries | Attacker can spoof IP |
| `1` | Trusts only first hop (load balancer) | Correct for single-LB |

## Error Responses
```typescript
// ❌ Leaks internal structure
return res.status(500).json({ error: error.message, stack: error.stack });

// ✅ Controlled message
throw HttpError.internalServerError('Task generation failed. Please try again.');
```

## Secrets Management
```typescript
// ✅ Read from environment
const apiKey = this.configService.get<string>('EXTERNAL_API_KEY');

// ✅ Log presence, not value
this.logger.log('External API key loaded:', !!apiKey);
```
