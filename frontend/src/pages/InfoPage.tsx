import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { InfoSection } from '../types';
import { localizedInfo } from '../utils/format';

export function InfoPage() {
  const [sections, setSections] = useState<InfoSection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { t, language } = useI18n();

  useEffect(() => {
    api.infoSections()
      .then(setSections)
      .catch(() => setSections([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className="section info-page">
      <div className="size-page-heading">
        <p className="eyebrow">{t('menswear')}</p>
        <h1>{t('info')}</h1>
      </div>

      {loaded && sections.length === 0 && <p className="size-chart-note">{t('infoEmpty')}</p>}

      <div className="info-sections">
        {sections.map(section => {
          const { title, body } = localizedInfo(section, language);
          return (
            <article className="info-section" key={section.id}>
              <h2>{title}</h2>
              {/* Plain text with line breaks preserved. No markup is interpreted, so a
                  section can never inject markup into the page. */}
              <p>{body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
