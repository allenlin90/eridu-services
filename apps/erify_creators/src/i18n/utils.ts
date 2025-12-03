/**
 * Utility functions for i18n integration
 *
 * This file provides utilities to work with both shared and app-specific translations
 */

import { isValidLocale, type Locale, setLocale as setSharedLocale } from '@eridu/i18n';

import { getLocale as getAppLocale, setLocale as setAppLocale } from '../paraglide/runtime.js';

// Re-export Locale type for convenience (it's the same as the shared one)
export type { Locale };

/**
 * Set the language tag for both shared and app-specific translations
 *
 * This synchronizes the locale across both the app-specific and shared translation systems.
 */
export function setLanguageTag(locale: Locale): void {
  // Set app-specific locale
  setAppLocale(locale, { reload: false });

  // Set shared locale (syncs both systems)
  setSharedLocale(locale, { reload: false });

  // Store in localStorage for persistence
  localStorage.setItem('language', locale);
}

/**
 * Get the current language tag (from app-specific translations)
 */
export function getLanguageTag(): Locale {
  return getAppLocale();
}

/**
 * Initialize i18n with a default language
 * Call this in your app's entry point
 */
export function initI18n(defaultLanguage: Locale = 'en'): void {
  // Try to get language from localStorage or browser settings
  const storedLanguage = localStorage.getItem('language') as Locale | null;

  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  let browserLanguage: Locale | null = null;
  if (browserLang.startsWith('zh')) {
    browserLanguage = 'zh-TW';
  } else if (browserLang.startsWith('th')) {
    browserLanguage = 'th';
  } else if (browserLang.startsWith('en')) {
    browserLanguage = 'en';
  }

  // Use isValidLocale for extensible validation
  const language = (storedLanguage && isValidLocale(storedLanguage) ? storedLanguage : null)
    || (browserLanguage && isValidLocale(browserLanguage) ? browserLanguage : null)
    || defaultLanguage;
  setLanguageTag(language);
}
