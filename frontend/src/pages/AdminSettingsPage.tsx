import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { AppSetting } from '../types';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    api.settings()
      .then(items => {
        setSettings(items);
        setDrafts(Object.fromEntries(items.map(item => [item.key, item.value])));
      })
      .catch(() => setSettings([]));
  }, []);

  const toggles = settings.filter(setting => setting.kind === 0);
  const contactFields = settings.filter(setting => setting.kind === 1);

  const toggle = async (setting: AppSetting) => {
    try {
      const updated = await api.updateSetting(setting.key, !setting.isEnabled);
      setSettings(current => current.map(item => (item.key === updated.key ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveText = async (setting: AppSetting) => {
    setSavingKey(setting.key);
    setError('');
    try {
      const updated = await api.updateSettingValue(setting.key, drafts[setting.key] ?? '');
      setSettings(current => current.map(item => (item.key === updated.key ? updated : item)));
      setSavedKey(setting.key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('storeControl')}</p>
        <h1>{t('settings')}</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <h2 className="admin-subheading">{t('contactDetails')}</h2>
      <p className="size-chart-note">{t('contactDetailsIntro')}</p>
      <div className="toggle-list contact-settings">
        {contactFields.map(setting => (
          <div className="contact-setting-row" key={setting.key}>
            <label htmlFor={`setting-${setting.key}`}>{setting.name}</label>
            <input
              id={`setting-${setting.key}`}
              value={drafts[setting.key] ?? ''}
              onChange={e => setDrafts(current => ({ ...current, [setting.key]: e.target.value }))}
            />
            <button
              className="btn btn-outline"
              onClick={() => saveText(setting)}
              disabled={savingKey === setting.key}
            >
              {savingKey === setting.key ? '...' : savedKey === setting.key ? t('saved') : t('save')}
            </button>
          </div>
        ))}
      </div>

      <h2 className="admin-subheading">{t('featureSwitches')}</h2>
      <div className="toggle-list">
        {toggles.map(setting => (
          <label className="toggle-row" key={setting.key}>
            <span>{setting.name}</span>
            <input type="checkbox" checked={setting.isEnabled} onChange={() => toggle(setting)} />
          </label>
        ))}
      </div>
    </div>
  );
}
