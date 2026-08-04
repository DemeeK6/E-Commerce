import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { AppSetting } from '../types';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    api.settings().then(setSettings).catch(() => setSettings([]));
  }, []);

  const toggle = async (setting: AppSetting) => {
    const updated = await api.updateSetting(setting.key, !setting.isEnabled);
    setSettings(settings.map(item => item.key === updated.key ? updated : item));
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('featureSwitches')}</p>
        <h1>{t('settings')}</h1>
      </div>
      <div className="toggle-list">
        {settings.map(setting => (
          <label className="toggle-row" key={setting.key}>
            <span>{setting.name}</span>
            <input type="checkbox" checked={setting.isEnabled} onChange={() => toggle(setting)} />
          </label>
        ))}
      </div>
    </div>
  );
}
