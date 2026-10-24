import { useI18n } from '../context/I18nContext';
import { SizeChart } from '../components/SizeChart';

export function SizesPage() {
  const { t } = useI18n();

  return (
    <section className="section">
      <div className="size-page-heading">
        <p className="eyebrow">{t('sizeGuide')}</p>
        <h1>{t('sizes')}</h1>
        <p className="size-chart-note">{t('sizeChartIntro')}</p>
      </div>
      {/* Men first, then women, each with its own measurements. */}
      <h2 className="size-chart-section-title">{t('men')}</h2>
      <SizeChart gender="men" />
      <h2 className="size-chart-section-title">{t('women')}</h2>
      <SizeChart gender="women" />
    </section>
  );
}
