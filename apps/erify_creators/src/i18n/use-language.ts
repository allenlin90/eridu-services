/**
 * Custom hook for language/locale management
 *
 * Provides a reactive way to get and set the current language preference.
 * The preference is stored in localStorage and persists across page reloads.
 */

import { useEffect, useState } from 'react';

import {
  AVAILABLE_LOCALES,
  isValidLocale,
  type Locale,
} from '@eridu/i18n';

import { getLanguageTag, setLanguageTag } from './utils.js';

const STORAGE_KEY = 'language';

/**
 * Custom hook for managing language preference
 *
 * @returns An object containing the current locale and a function to change it
 *
 * @example
 * ```tsx
 * function LanguageSwitcher() {
 *   const { locale, setLocale, availableLocales } = useLanguage();
 *
 *   return (
 *     <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
 *       {availableLocales.map(loc => (
 *         <option key={loc} value={loc}>{loc}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useLanguage() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Initialize from localStorage or current Paraglide locale
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && isValidLocale(stored)) {
        return stored;
      }
    }
    return getLanguageTag();
  });

  // Sync state with Paraglide on mount
  useEffect(() => {
    const currentLocale = getLanguageTag();
    if (currentLocale !== locale) {
      setLocaleState(currentLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to sync initial state

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newLocale = e.newValue as Locale;
        if (isValidLocale(newLocale) && newLocale !== locale) {
          setLanguageTag(newLocale);
          setLocaleState(newLocale);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [locale]);

  /**
   * Change the current language
   *
   * @param newLocale - The locale to switch to
   */
  const setLocale = (newLocale: Locale) => {
    if (!isValidLocale(newLocale)) {
      console.warn(`Invalid locale: ${newLocale}. Falling back to 'en'.`);
      setLanguageTag('en');
      setLocaleState('en');
      return;
    }

    setLanguageTag(newLocale);
    setLocaleState(newLocale);
  };

  return {
    /** Current locale */
    locale,
    /** Function to change the locale */
    setLocale,
    /** List of available locales */
    availableLocales: AVAILABLE_LOCALES,
    /** Check if a locale is currently selected */
    isLocale: (loc: Locale) => loc === locale,
  };
}
