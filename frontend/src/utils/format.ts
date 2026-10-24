/** Dollars: "$34.00". */
export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Lari, as products are priced: "88.00 ₾". The admin panel uses this; the shop uses useCurrency(). */
export function lari(value: number) {
  return formatAmount(value, 'GEL');
}

/** "$68.00" or "176.52 ₾" - lari with the symbol after, as Georgian shops write it. */
export function formatAmount(value: number, currency: 'USD' | 'GEL') {
  if (currency === 'USD') return money(value);
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ₾`;
}

export function localizedName(
  item: { nameEn: string; nameKa: string },
  language: 'en' | 'ka',
): string {
  const byLanguage: Record<'en' | 'ka', string> = {
    en: item.nameEn,
    ka: item.nameKa,
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
  section: { titleEn: string; titleKa: string; bodyEn: string; bodyKa: string },
  language: 'en' | 'ka',
): { title: string; body: string } {
  const pick = (ka: string, en: string) => {
    const localized = language === 'ka' ? ka : en;
    return localized && localized.trim() !== '' ? localized : en;
  };

  return {
    title: pick(section.titleKa, section.titleEn),
    body: pick(section.bodyKa, section.bodyEn),
  };
}

/**
 * Picks the shopper's language, then the English override, then the built-in
 * translation - so the shop owner can change only the English line and every
 * language still shows something sensible.
 */
export function localizedOverride(
  values: { en: string; ka: string },
  language: 'en' | 'ka',
  builtIn: string,
): string {
  const localized = values[language]?.trim();
  if (localized) return localized;
  return values.en?.trim() || builtIn;
}
