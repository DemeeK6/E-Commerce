import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import ka from '../i18n/ka.json';

export type Language = 'en' | 'ka';
type Dictionary = typeof en;

const dictionaries: Record<Language, Dictionary> = { en, ka };

const I18nContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Dictionary) => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Georgian or English. Anything else stored earlier (Russian was removed) falls back to English.
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') === 'ka' ? 'ka' : 'en'));
  const setLanguage = (next: Language) => {
    localStorage.setItem('language', next);
    setLanguageState(next);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: keyof Dictionary) => dictionaries[language][key] ?? dictionaries.en[key] ?? key,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
