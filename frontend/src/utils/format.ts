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
