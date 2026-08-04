import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import ka from '../i18n/ka.json';
import ru from '../i18n/ru.json';

type Language = 'en' | 'ka' | 'ru';
type Dictionary = typeof en;

const dictionaries: Record<Language, Dictionary> = { en, ka, ru };

const I18nContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Dictionary) => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
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
