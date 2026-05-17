---
name: frontend-i18n
description: Provides guidelines for implementing internationalization (i18n) in frontend applications using Paraglide JS and the shared @eridu/i18n package. Use when adding translations, configuring i18n, or working with the @eridu/i18n package.
---

# Frontend i18n Pattern

Internationalization using Paraglide JS and the shared `@eridu/i18n` package.

## Architecture

- **Tooling**: `@inlang/paraglide-js` (v2+)
- **Config**: `project.inlang` at app root
- **Messages**: `src/i18n/messages/{lang}.json`
- **Output**: Generated in `src/paraglide` (gitignored)
- **Shared**: `@eridu/i18n` for common translations and locale definitions

## Adding Translations

1. Add key-value pair to `src/i18n/messages/en.json` (source language)
2. Dev server auto-regenerates `src/paraglide`
3. Use in component via `import * as m from '@/paraglide/messages'`

## Usage

```tsx
// App-specific (bracket notation for nested dot keys)
import * as m from '@/paraglide/messages';
const title = m['dashboard.title']();
const welcome = m['dashboard.welcomeUser']({ name: userName });

// Shared terms (Save, Cancel, etc.)
import * as sharedM from '@eridu/i18n';
<Button>{sharedM['common.save']()}</Button>
```

## Shared UI Abstraction (`@eridu/ui`)

Generic `@eridu/ui` components import `@eridu/i18n` for defaults and expose `textOverrides` props for app-specific terminology.

## Best Practices

1. **Group** by feature/page (`admin`, `auth`, `settings`)
2. **camelCase** keys (`welcomeUser` not `welcome-user`)
3. **Named parameters** `{param}` not positional
4. **No hardcoding** — always extract to `en.json`
5. **Check shared first** before adding generic terms

## Troubleshooting

- **Missing type**: Run `pnpm dev` or `pnpm build` to regenerate Paraglide files
- **TS1005 build error**: Paraglide `.d.ts` bug — apply `patch-dts` script (see `@eridu/i18n` `package.json`)
