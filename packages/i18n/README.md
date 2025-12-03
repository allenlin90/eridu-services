# @eridu/i18n

Shared i18n translations package for Eridu Services monorepo.

This package provides common translations that can be shared across all applications. Each app should have its own app-specific translations setup.

## Overview

This package uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for type-safe internationalization with compile-time translation processing.

### Architecture

- **Shared Package (`@eridu/i18n`)**: Contains common translations shared across all apps
- **App-Specific Translations**: Each app has its own translations in `src/i18n/messages/`

### Supported Languages

- English (`en`) - Default
- Traditional Chinese (`zh-TW`)
- Thai (`th`)

## Setup

### Initial Setup

1. **Build the shared i18n package**:
   ```bash
   cd packages/i18n
   pnpm build
   ```
   This compiles translations and generates Paraglide runtime files.

2. **Build app-specific translations**:
   ```bash
   cd apps/[app-name]
   pnpm build
   ```
   Or run in dev mode (auto-compiles on changes):
   ```bash
   pnpm dev
   ```

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
import { setLocale, getLocale } from '@eridu/i18n';
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
import { LocaleEnum, AVAILABLE_LOCALES, LOCALE_LABELS, isValidLocale } from '@eridu/i18n';

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
      {availableLocales.map(loc => (
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
   }
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
│   ├── en.json          # English translations
│   ├── zh-TW.json       # Traditional Chinese translations
│   └── th.json          # Thai translations
├── src/
│   ├── index.ts         # Package exports
│   ├── locales.ts       # Locale enum and utilities
│   └── paraglide/       # Generated files (gitignored)
│       ├── messages.js
│       └── runtime.js
└── project.inlang/
    └── settings.json    # Paraglide configuration

apps/[app-name]/
├── src/
│   ├── i18n/
│   │   ├── messages/
│   │   │   ├── en.json
│   │   │   ├── zh-TW.json
│   │   │   └── th.json
│   │   ├── index.ts
│   │   ├── utils.ts
│   │   └── use-language.ts  # React hook
│   └── paraglide/       # Generated files (gitignored)
│       ├── messages.js
│       └── runtime.js
└── project.inlang/
    └── settings.json    # Paraglide configuration
```

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
