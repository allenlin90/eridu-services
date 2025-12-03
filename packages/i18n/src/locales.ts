/**
 * Supported locales for the Eridu Services monorepo
 *
 * This enum/object defines all available locales that can be used across
 * all applications. Add new locales here when adding support for new languages.
 */

import { locales } from './paraglide/runtime.js';

/**
 * Type for locale values (derived from Paraglide)
 */
export type Locale = (typeof locales)[number];

/**
 * Enum of supported locales
 * Use this enum for type-safe locale references in your code
 */
export enum LocaleEnum {
  English = 'en',
  TraditionalChinese = 'zh-TW',
  Thai = 'th',
}

/**
 * Array of all available locale values
 * This is derived from Paraglide's runtime to ensure consistency
 */
export const AVAILABLE_LOCALES = locales as readonly Locale[];

/**
 * Object mapping locale codes to their display names
 * Useful for UI components that need to show language names
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  [LocaleEnum.English]: 'English',
  [LocaleEnum.TraditionalChinese]: '繁體中文',
  [LocaleEnum.Thai]: 'ไทย',
} as const;

/**
 * Check if a string is a valid locale
 * Uses Array.includes() for extensibility
 *
 * @param value - The string to validate
 * @returns True if the value is a valid locale
 */
export function isValidLocale(value: string): value is Locale {
  return (AVAILABLE_LOCALES as readonly string[]).includes(value);
}

/**
 * Alternative validation using object key access
 * This approach is also extensible and type-safe
 */
export function isValidLocaleByKey(value: string): value is Locale {
  return value in LOCALE_LABELS;
}
