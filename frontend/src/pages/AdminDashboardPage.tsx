import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const { t } = useI18n();

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setStats({}));
  }, []);

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('storeControl')}</p>
        <h1>{t('dashboard')}</h1>
      </div>
      <div className="stat-grid">
        {Object.entries(stats).map(([key, value]) => (
          <article className="stat-card" key={key}>
            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
