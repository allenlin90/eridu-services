---
name: secure-coding-practices
description: Secure erify_api and erify_studios endpoints, uploads, and auth. Use the threat skill for architecture.
---

# Secure Coding Practices

Per-feature implementation checklist — not a threat model. Apply when writing new code or reviewing a PR.

> See [references/security-examples.md](references/security-examples.md) for extended code examples.

## Rules

### 1. Input Validation — Zod at Every Boundary
Every external input validated through Zod before service layer. Path params use `UidValidationPipe`. Query numbers use `z.coerce.number()`.

### 2. Never Expose Internal IDs
BigInt database IDs must never appear in API responses, error messages, or logs. Only UIDs externally.

### 3. SQL Injection — Prisma Parameterisation
`$queryRaw` must use `Prisma.sql` template literals. Never string concatenation. `IN` clauses: `Prisma.join(ids)`.

### 4. Authorization — Never Skip Studio Scoping
Studio-scoped queries must include `studio: { uid: studioUid }`. `@StudioProtected()` validates membership but does NOT scope DB queries.

### 5. Presigned URLs — Expiry and Path Validation
Validate MIME type/extension, keep expiry short (15-60 min), generate storage key server-side. See `file-upload-presign` skill.

### 6. Rate Limiting
Auth endpoints retain `ThrottlerGuard`. Custom `AppThrottlerGuard` tracks by `user.ext_id + IP`. `trust proxy` set to `1` (not `true`).

### 7. Secrets — Environment Variables Only
No secrets in code or committed config. Never log secret values — log boolean presence only.

### 8. Error Responses — Don't Leak Stack Traces
Use `HttpError` utilities. Never serialize raw `error.message` or `error.stack` to clients.

### 9. CORS and Headers
CORS is app-level — don't override per-controller. File downloads: `Content-Disposition: attachment`.

## Pre-Merge Checklist

- [ ] All inputs validated through Zod
- [ ] Path params use `UidValidationPipe`
- [ ] No `$queryRaw` string interpolation
- [ ] Studio-scoped queries include studio constraint
- [ ] No internal BigInt IDs in responses/errors/logs
- [ ] No secrets in code or config
- [ ] Auth endpoints retain throttle guards
- [ ] `trust proxy` set to `1`

## Related Skills

- [data-validation](../data-validation/SKILL.md) — Zod schema patterns, UID rules
- [observability-logging](../observability-logging/SKILL.md) — What must never appear in logs
- [file-upload-presign](../file-upload-presign/SKILL.md) — Secure presigned upload contract
- [eridu-security-threat-model](../eridu-security-threat-model/SKILL.md) — Architectural threat analysis
