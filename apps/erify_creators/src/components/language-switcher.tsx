/**
 * Language Switcher Component
 *
 * A reusable component for switching between available languages.
 * Uses the useLanguage hook to manage language state.
 *
 * @example
 * ```tsx
 * import { LanguageSwitcher } from '@/components/language-switcher';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <LanguageSwitcher />
 *     </header>
 *   );
 * }
 * ```
 */

import { LOCALE_LABELS } from '@eridu/i18n';

import { useLanguage } from '@/i18n';

/**
 * Language Switcher Component
 *
 * Displays a dropdown/select element to switch between available languages.
 * The selection is persisted in localStorage.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as typeof locale);
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="rounded border border-gray-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      aria-label="Select language"
    >
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
