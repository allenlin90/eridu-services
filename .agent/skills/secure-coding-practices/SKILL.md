---
name: secure-coding-practices
description: Implementation-level security checklist for erify_api and erify_studios. Use when writing a new endpoint, adding file upload handling, building an auth flow, or reviewing code for security issues. Covers input validation, ID exposure prevention, SQL injection, rate limiting, secrets management, and OWASP-relevant patterns for this stack. Distinct from security-threat-model which produces architectural threat assessments.
---

# Secure Coding Practices

This skill is a per-feature implementation checklist — not a threat model. Apply it when writing new code or reviewing a PR.

---

## 1. Input Validation — Zod at Every Boundary

**Rule**: Every external input (query params, request body, path params) must be validated through a Zod schema before reaching the service layer. Never trust raw `req.body`.

```typescript
// ✅ Body validated via @ZodBody() or NestJS Pipes — shape guaranteed before service call
@Post()
create(@Body() dto: CreateShowDto) {  // dto already Zod-validated
  return this.showService.create(dto);
}

// ❌ Raw body access bypasses Zod
@Post()
create(@Req() req: Request) {
  const name = req.body.name;  // No schema enforcement
}
```

**Path params**: Always use `UidValidationPipe` for UID params — rejects malformed IDs before they reach DB queries.

```typescript
@Get(':showId')
findOne(@Param('showId', UidValidationPipe) showUid: string) { ... }
```

**Number coercion**: Use `z.coerce.number()` for query params that should be integers. Raw strings from query params bypass type validation without coercion.

---

## 2. Never Expose Internal IDs

**Rule**: BigInt database IDs must never appear in API responses, error messages, or logs. Only UIDs (`show_abc123`) are exposed externally.

```typescript
// ❌ Exposes internal DB sequence
throw HttpError.notFound('Show', show.id.toString());
// Response: { message: "Show not found with id 12345" }

// ✅ Expose UID only
throw HttpError.notFound('Show', show.uid);
// Response: { message: "Show not found with id show_abc123" }
```

See `data-validation` skill for the full UID contract.

---

## 3. SQL Injection — Use Prisma Parameterisation

**Rule**: Prisma ORM automatically parameterises all queries. `$queryRaw` must use `Prisma.sql` template literals — never string concatenation.

```typescript
// ✅ Safe — Prisma.sql parameterises values
const rows = await prisma.$queryRaw<Row[]>(
  Prisma.sql`SELECT * FROM shows WHERE studio_id = ${studioId}`,
);

// ❌ SQL injection risk — string concatenation
const rows = await prisma.$queryRaw<Row[]>(
  `SELECT * FROM shows WHERE studio_id = ${studioId}`,  // studioId is interpolated as raw string
);
```

For `IN (...)` clauses with dynamic arrays:
```typescript
// ✅ Safe
Prisma.sql`WHERE id IN (${Prisma.join(ids)})`
```

---

## 4. Authorization — Never Skip Studio Scoping

**Rule**: Studio-scoped endpoints must scope ALL queries to the authenticated studio. A request for `studioId=studio_A` must never be able to return or modify data from `studio_B`.

```typescript
// ✅ Studio UID included in every query
const template = await this.repository.findOne({
  uid: templateUid,
  studio: { uid: studioUid },  // ← Prevents cross-studio access
});

// ❌ Only UID checked — another studio's template could match
const template = await this.repository.findOne({ uid: templateUid });
```

The `@StudioProtected()` guard validates membership but does NOT scope DB queries — the service must add the studio constraint explicitly.

---

## 5. Presigned URLs — Expiry and Path Validation

**Rule**: Presigned R2 URLs expire. Never store them as permanent references. Validate upload path/type server-side before issuing the presigned URL.

- Always validate MIME type and file extension against an allowlist before signing.
- Keep expiry short (15–60 minutes for uploads).
- Do not sign arbitrary client-provided paths — generate the storage key server-side.

See `file-upload-presign` skill for the full upload contract.

---

## 6. Authentication Endpoints — Rate Limiting

Auth endpoints are already rate-limited by the `ThrottlerGuard`. Do not bypass or override throttle decorators without a documented reason.

```typescript
// ✅ Default throttle applies from global guard
@Post('login')
login(@Body() dto: LoginDto) { ... }

// ❌ Never skip throttle on auth endpoints
@SkipThrottle()
@Post('login')
login(...) { ... }
```

### Custom Throttler Guard (AppThrottlerGuard)

The project uses a custom `AppThrottlerGuard` that extends NestJS's `ThrottlerGuard` and overrides `getTracker()`:

- **Tracks by `user.ext_id + IP`** instead of IP alone
- Prevents a single user from bypassing their quota by switching IPs or rotating proxies
- Falls back to `anonymous` + IP for unauthenticated requests
- Registered as `APP_GUARD` in `app.module.ts` so it applies globally before any other guard

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

Use `app.set('trust proxy', 1)` (single hop) instead of `app.set('trust proxy', true)`.

| Setting | Behavior | Risk |
|---------|---------|------|
| `true` | Trusts **all** `X-Forwarded-For` entries | Attacker can spoof IP by prepending extra hops |
| `1` | Trusts only the **first** hop (load balancer / ingress) | Correct for single-LB deployments |

```typescript
// ✅ Single-hop trust — correct for one load balancer in front of the app
app.set('trust proxy', 1);

// ❌ Trusts all X-Forwarded-For headers — spoofable
app.set('trust proxy', true);
```

**Rule**: Set `trust proxy` to the exact number of trusted proxies (typically `1` for a single ingress/LB layer). This ensures `req.ip` resolves to the real client IP and the throttler tracks the correct address.

---

## 7. Secrets — Environment Variables Only

**Rule**: No secrets, API keys, or credentials in source code, config files committed to the repo, or log output.

```typescript
// ✅ Read from environment
const apiKey = this.configService.get<string>('EXTERNAL_API_KEY');

// ❌ Hardcoded secret
const apiKey = 'sk-live-abc123...';
```

Never log `configService.get(...)` output for keys that contain secrets. If you need to confirm a config value is loaded, log a boolean: `this.logger.log('External API key loaded:', !!apiKey)`.

---

## 8. Error Responses — Don't Leak Stack Traces

**Rule**: NestJS's global exception filter already strips stack traces from HTTP responses. Do not manually serialize errors in controllers or send raw `error.message` from caught exceptions to clients.

```typescript
// ❌ Leaks internal structure
return res.status(500).json({ error: error.message, stack: error.stack });

// ✅ Use HttpError — message is controlled and intentional
throw HttpError.internalServerError('Task generation failed. Please try again.');
```

---

## 9. CORS and Headers

CORS configuration is app-level — do not override it per-controller. If a new route needs different CORS behavior, discuss before modifying the global config.

For file download endpoints, set `Content-Disposition: attachment` to prevent inline execution of user-uploaded content.

---

## 10. Pre-Merge Security Checklist

Before marking a feature complete, verify:

- [ ] All external inputs validated through Zod schemas
- [ ] Path params use `UidValidationPipe`
- [ ] No `$queryRaw` uses string interpolation (only `Prisma.sql`)
- [ ] Studio-scoped queries include `studio: { uid: studioUid }` constraint
- [ ] No internal BigInt IDs in API responses or error messages
- [ ] No secrets in code or committed config
- [ ] No `console.log` with tokens, passwords, or full request bodies
- [ ] Auth endpoints retain throttle guards
- [ ] Read-heavy list endpoints use `@ReadBurstThrottle()`, not `@SkipThrottle()`
- [ ] `trust proxy` is set to `1`, not `true`

---

## Related Skills

- **[Data Validation](../data-validation/SKILL.md)**: Full Zod schema patterns and UID rules.
- **[Observability Logging](../observability-logging/SKILL.md)**: What must never appear in logs.
- **[File Upload Presign](../file-upload-presign/SKILL.md)**: Secure presigned upload contract.
- **[Security Threat Model](../security-threat-model/SKILL.md)**: Architectural-level threat analysis (use for system-wide AppSec assessment, not per-feature implementation).
