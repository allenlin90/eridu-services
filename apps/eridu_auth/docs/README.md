# eridu_auth Documentation

> **TLDR**: SSO authentication service built on [Better Auth](https://better-auth.com/). Phase 1 provides email/password auth with JWT (EdDSA/Ed25519). SSO providers (Google, LINE) are configured but not yet enabled.

## Guides

| Document | Description |
|----------|-------------|
| [Setup Guide](./SETUP_GUIDE.md) | Environment variables, installation, auth flow, seeding, and testing |
| [SSO Guide](./SSO_GUIDE.md) | Multi-provider SSO architecture, Google/LINE setup, frontend integration |

## Related

| Resource | Description |
|----------|-------------|
| [Auth SDK](../../packages/auth-sdk/README.md) | JWT/JWKS validation SDK used by consuming services |
| [erify_api Auth](../erify_api/docs/ARCHITECTURE_OVERVIEW.md) | How erify_api integrates with eridu_auth |
| [API Types](../../packages/api-types/README.md) | Shared schemas including user types |
