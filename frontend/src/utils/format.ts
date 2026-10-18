export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function localizedName(
  item: { nameEn: string; nameKa: string; nameRu: string },
  language: 'en' | 'ka' | 'ru',
): string {
  const byLanguage: Record<'en' | 'ka' | 'ru', string> = {
    en: item.nameEn,
    ka: item.nameKa,
    ru: item.nameRu,
  };

  const localized = byLanguage[language];
  if (localized && localized.trim() !== '') {
    return localized;
  }

  return item.nameEn && item.nameEn.trim() !== '' ? item.nameEn : '';
}

/**
 * Picks an info section's title and body for the active language, each falling back to
 * English independently - a half-translated section still reads correctly rather than
 * showing a blank heading over translated text.
 */
export function localizedInfo(
  section: { titleEn: string; titleKa: string; titleRu: string; bodyEn: string; bodyKa: string; bodyRu: string },
  language: 'en' | 'ka' | 'ru',
): { title: string; body: string } {
  const pick = (ka: string, ru: string, en: string) => {
    const localized = language === 'ka' ? ka : language === 'ru' ? ru : en;
    return localized && localized.trim() !== '' ? localized : en;
  };

  return {
    title: pick(section.titleKa, section.titleRu, section.titleEn),
    body: pick(section.bodyKa, section.bodyRu, section.bodyEn),
  };
}

/**
 * Picks the shopper's language, then the English override, then the built-in
 * translation - so the shop owner can change only the English line and every
 * language still shows something sensible.
 */
export function localizedOverride(
  values: { en: string; ka: string; ru: string },
  language: 'en' | 'ka' | 'ru',
  builtIn: string,
): string {
  const localized = values[language]?.trim();
  if (localized) return localized;
  return values.en?.trim() || builtIn;
}
