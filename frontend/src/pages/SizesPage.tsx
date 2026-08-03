import { useI18n } from '../context/I18nContext';
import { SizeChart } from '../components/SizeChart';

export function SizesPage() {
  const { t } = useI18n();

  return (
    <section className="section">
      <div className="size-page-heading">
        <p className="eyebrow">{t('menswear')}</p>
        <h1>{t('sizes')}</h1>
        <p className="size-chart-note">{t('sizeChartIntro')}</p>
      </div>
      <SizeChart />
    </section>
  );
}
