/**
 * Shared i18n package for Eridu Services
 *
 * This package provides common translations that can be shared across
 * all applications in the monorepo.
 *
 * App-specific translations should be defined in each app's own i18n setup.
 *
 * Note: The paraglide files are generated during build. Make sure to run
 * `pnpm build` in this package before using it in other apps.
 */

// These exports will be available after running the build command
// The paraglide files are generated in dist/paraglide/ during build (precompiled)
// Type exports - Paraglide uses JSDoc types
// Import runtime to extract the Locale type
// Note: These imports resolve to dist/paraglide/ at runtime after build

export * from './paraglide/messages.js';
export { baseLocale, getLocale, locales, setLocale } from './paraglide/runtime.js';

// Export locale enum, type, and utilities
export type { Locale } from './locales.js';
export {
  AVAILABLE_LOCALES,
  isValidLocale,
  isValidLocaleByKey,
  LOCALE_LABELS,
  LocaleEnum,
} from './locales.js';
