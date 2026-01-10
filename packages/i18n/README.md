# @eridu/i18n

**Current Status**: Phase 1 ✅ - Shared translations (3 languages) + Paraglide compilation

Shared i18n translations package for Eridu Services monorepo.

This package provides common translations that can be shared across all applications. Each app maintains its own app-specific translations while importing from this package.

## Overview

This package uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for **type-safe internationalization with compile-time translation processing**. Translations are precompiled during the build process into framework-agnostic runtime code.

### Architecture

- **Precompilation Strategy**: Translations are compiled at build time to JavaScript + TypeScript definitions
  - Shared package (`@eridu/i18n`): Compiles common translations → `dist/` + `src/paraglide/`
  - Each app: Compiles app-specific translations → `src/paraglide/`
- **Shared Package (`@eridu/i18n`)**: Provides common translations from `messages/{lang}.json`
- **App-Specific Translations**: Each app has its own translations in `src/i18n/messages/` + `use-language` hook + synchronization utilities

### Supported Languages

- English (`en`) - Default
- Traditional Chinese (`zh-TW`)
- Thai (`th`)

## Setup

### Initial Setup

1. **Build shared translations** (must be done before using in apps):
   ```bash
   cd packages/i18n
   pnpm build  # Compiles messages + generates src/paraglide/ and dist/
   ```
   This compiles translations from `messages/{lang}.json` and generates:
   - `src/paraglide/` - Generated Paraglide runtime files
   - `dist/` - Built package for distribution (included in exports)

2. **Build/dev app-specific translations**:
   ```bash
   cd apps/[app-name]
   pnpm build  # One-time compilation
   # OR
   pnpm dev    # Watch mode (auto-compiles on file changes)
   ```
   This compiles app-specific messages and merges with shared translations.

**Important**: Both shared and app packages must be built before running the full application.

### Development

```bash
# Build translations
pnpm build

# Watch mode for development (auto-recompiles on changes)
pnpm dev
```

## Usage

### Basic Usage

```typescript
import { getLocale, setLocale } from '@eridu/i18n';
import * as m from '@eridu/i18n';

// Set the language
setLocale('en', { reload: false }); // or 'zh-TW', 'th'

// Get current language
const currentLang = getLocale(); // 'en' | 'zh-TW' | 'th'

// Use translations
const welcome = m.common_welcome(); // "Welcome", "歡迎", or "ยินดีต้อนรับ"
```

### Using Locale Enum and Utilities

```typescript
import { AVAILABLE_LOCALES, isValidLocale, LOCALE_LABELS, LocaleEnum } from '@eridu/i18n';

// Use enum for type-safe references
const locale = LocaleEnum.Thai; // 'th'

// Get all available locales
const locales = AVAILABLE_LOCALES; // ['en', 'zh-TW', 'th']

// Get display labels
const label = LOCALE_LABELS[LocaleEnum.Thai]; // 'ไทย'

// Validate locale
if (isValidLocale('th')) {
  // Valid locale
}
```

### In Apps (with App-Specific Translations)

```typescript
// Import shared translations
import * as shared from '@eridu/i18n';

// Import app-specific translations
import * as m from '@/i18n';

// Use translations
const appName = m.app_name();
const welcome = shared.common_welcome();
```

### Using the React Hook (Recommended)

```tsx
import { useLanguage } from '@/i18n';

function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useLanguage();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>{loc}</option>
      ))}
    </select>
  );
}
```

## Adding New Translations

### Shared Translations

1. Edit the appropriate language file in `packages/i18n/messages/`:
   - `en.json` - English (source language)
   - `zh-TW.json` - Traditional Chinese
   - `th.json` - Thai
   - Add new language files as needed

2. Run `pnpm build` in the `packages/i18n` directory

3. Translations will be available in all apps that use this package

### App-Specific Translations

1. Edit language files in `apps/[app-name]/src/i18n/messages/`
2. Files are automatically compiled during dev/build

### Adding a New Language

1. **Update Paraglide configuration**:
   - Add language tag to `project.inlang/settings.json` in both shared and app packages:
     ```json
     "languageTags": ["en", "zh-TW", "th", "new-lang"]
     ```

2. **Update locale enum** (`packages/i18n/src/locales.ts`):
   ```typescript
   export enum LocaleEnum {
     // ... existing locales
     NewLanguage = 'new-lang',
   }
   ```

3. **Add locale label**:
   ```typescript
   export const LOCALE_LABELS: Record<Locale, string> = {
     // ... existing labels
     [LocaleEnum.NewLanguage]: 'Display Name',
   };
   ```

4. **Create translation files**:
   - `packages/i18n/messages/new-lang.json`
   - `apps/[app-name]/src/i18n/messages/new-lang.json`

5. **Rebuild packages**:
   ```bash
   cd packages/i18n && pnpm build
   cd apps/[app-name] && pnpm build
   ```

## File Structure

```
packages/i18n/
├── messages/
│   ├── en.json           # English messages (source of truth)
│   ├── zh-TW.json        # Traditional Chinese messages
│   └── th.json           # Thai messages
├── src/
│   ├── paraglide/        # Generated Paraglide runtime (auto-generated, don't edit)
│   ├── lib/
│   │   └── i18n.ts       # Shared i18n utilities & runtime config
│   ├── locales.ts        # Locale enum and utilities (LocaleEnum, LOCALE_LABELS, isValidLocale)
│   └── index.ts          # Package exports (exports compiled messages + paraglide)
├── dist/                 # Built package output (included in exports)
├── vite.config.ts        # Vite config for compilation
├── inlang.config.mjs     # Paraglide configuration (language tags, output paths)
├── project.inlang/       # VS Code extension data (auto-generated)
├── package.json
└── tsconfig.json

apps/[app-name]/
├── src/
│   ├── i18n/
│   │   ├── messages/
│   │   │   ├── en.json           # App-specific English translations
│   │   │   ├── zh-TW.json        # App-specific Traditional Chinese
│   │   │   └── th.json           # App-specific Thai
│   │   ├── index.ts              # App i18n exports
│   │   ├── utils.ts              # App-specific i18n utilities
│   │   └── use-language.ts       # React hook for language switching
│   └── paraglide/                # Generated app-specific runtime (auto-generated)
├── vite.config.ts
├── inlang.config.mjs             # Paraglide configuration for this app
├── project.inlang/               # VS Code extension data (auto-generated)
└── package.json
```

### Generated Files (Don't Edit)
- **`paraglide/`**: Auto-generated by Paraglide during build
  - Contains compiled messages and language runtime functions
- **`project.inlang/`**: Auto-generated by Paraglide VS Code extension
  - Metadata for IDE features (hover info, autocomplete)

## Troubleshooting

### "Cannot find module '../paraglide/messages.js'"

The Paraglide files haven't been generated yet. Run:

```bash
# For shared package
cd packages/i18n && pnpm build

# For app (or just run dev mode)
cd apps/[app-name] && pnpm dev
```

### Translations not updating

1. Make sure you've saved the JSON files
2. In dev mode, files should auto-recompile
3. Try restarting the dev server
4. Ensure both packages are built: `pnpm build`

### Type errors

Make sure both packages are built:

```bash
cd packages/i18n && pnpm build
cd apps/[app-name] && pnpm build
```

### Invalid locale errors

Ensure the locale is included in:
- `project.inlang/settings.json` → `languageTags` array
- `packages/i18n/src/locales.ts` → `LocaleEnum` and `LOCALE_LABELS`

## Type Safety

Paraglide JS provides full type safety:
- TypeScript will error if you use a non-existent translation key
- Autocomplete works for all translation keys
- Locale types are enforced at compile time
