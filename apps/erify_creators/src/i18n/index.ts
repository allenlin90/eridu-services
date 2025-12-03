/**
 * App-specific i18n translations for erify_creators
 *
 * This file exports app-specific translations. For common/shared translations,
 * import from @eridu/i18n package.
 */

import type { locales } from '../paraglide/runtime.js';

export * from '../paraglide/messages.js';
export { baseLocale, getLocale, locales, setLocale } from '../paraglide/runtime.js';

// Type exports
export type Locale = (typeof locales)[number];

// Re-export shared translations for convenience
export * as shared from '@eridu/i18n';

// Export utility functions
export type { Locale as AvailableLanguageTag } from './utils.js';
export { getLanguageTag, initI18n, setLanguageTag as setUnifiedLanguageTag } from './utils.js';

// Export React hook
export { useLanguage } from './use-language.js';
