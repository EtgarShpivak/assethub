'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { translations, type Locale } from './translations';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType>({
  locale: 'he',
  setLocale: () => {},
  t: (key: string) => key,
  dir: 'rtl',
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('he');

  // Load persisted locale
  useEffect(() => {
    const saved = localStorage.getItem('assethub-locale') as Locale | null;
    if (saved && (saved === 'he' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('assethub-locale', newLocale);
    // Update document direction
    document.documentElement.dir = newLocale === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  }, []);

  // Set initial direction
  useEffect(() => {
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || translations['he']?.[key] || key;
  }, [locale]);

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
