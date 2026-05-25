/**
 * Utility functions for i18n integration
 *
 * Creators portal uses English-only inline copy for new UI until a project-wide
 * Paraglide migration. Legacy shows modules may still read Paraglide messages.
 */

import { type Locale, setLocale as setSharedLocale } from '@eridu/i18n';

import { getLocale as getAppLocale, setLocale as setAppLocale } from '../paraglide/runtime.js';

export type { Locale };

const ENGLISH_ONLY_LOCALE: Locale = 'en';

/**
 * Set the language tag for both shared and app-specific translations
 */
export function setLanguageTag(_locale: Locale = ENGLISH_ONLY_LOCALE): void {
  setAppLocale(ENGLISH_ONLY_LOCALE, { reload: false });
  setSharedLocale(ENGLISH_ONLY_LOCALE, { reload: false });
  localStorage.setItem('language', ENGLISH_ONLY_LOCALE);
}

export function getLanguageTag(): Locale {
  return getAppLocale();
}

/**
 * Initialize i18n — always English until bulk Paraglide rollout.
 */
export function initI18n(): void {
  const stored = localStorage.getItem('language');
  if (stored && stored !== 'en') {
    localStorage.setItem('language', 'en');
  }
  setLanguageTag(ENGLISH_ONLY_LOCALE);
}
