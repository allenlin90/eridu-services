/**
 * Language hook — English-only for creators portal until bulk i18n migration.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Locale } from '@eridu/i18n';

import { getLanguageTag, setLanguageTag } from './utils.js';

const STORAGE_KEY = 'language';
const AVAILABLE_LOCALES = ['en'] as const satisfies readonly Locale[];

export function useLanguage() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en') {
        return 'en';
      }
    }
    return getLanguageTag();
  });

  useEffect(() => {
    const currentLocale = getLanguageTag();
    if (currentLocale !== locale) {
      setLocaleState(currentLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === 'en' && e.newValue !== locale) {
        setLanguageTag('en');
        setLocaleState('en');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale !== 'en') {
      console.warn(`Creators portal is English-only until i18n migration. Ignoring locale: ${newLocale}`);
    }
    setLanguageTag('en');
    setLocaleState('en');
  }, []);

  return {
    locale,
    setLocale,
    availableLocales: AVAILABLE_LOCALES,
    isLocale: (loc: Locale) => loc === locale,
  };
}
