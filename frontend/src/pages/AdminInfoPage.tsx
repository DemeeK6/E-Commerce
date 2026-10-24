import { useEffect, useState } from 'react';
import { AdminHeroEditor } from '../components/AdminHeroEditor';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { InfoSection } from '../types';

export function AdminInfoPage() {
  const [sections, setSections] = useState<InfoSection[]>([]);
  const [drafts, setDrafts] = useState<Record<number, InfoSection>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    api.infoSections(true)
      .then(items => {
        setSections(items);
        setDrafts(Object.fromEntries(items.map(item => [item.id, item])));
      })
      .catch(() => setSections([]));
  }, []);

  const edit = (id: number, patch: Partial<InfoSection>) =>
    setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }));

  const save = async (id: number) => {
    setSavingId(id);
    setError('');
    try {
      const updated = await api.saveInfoSection(drafts[id]);
      setSections(current => current.map(s => (s.id === id ? updated : s)));
      setDrafts(current => ({ ...current, [id]: updated }));
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('storeControl')}</p>
        <h1>{t('infoPage')}</h1>
      </div>

      <AdminHeroEditor />

      <h2 className="info-editor-heading">{t('infoSectionsHeading')}</h2>
      <p className="size-chart-note">{t('infoPageIntro')}</p>
      {error && <p className="form-error">{error}</p>}

      <div className="admin-table info-editor">
        {sections.map(section => {
          const draft = drafts[section.id] ?? section;
          return (
            <article className="admin-row info-editor-row" key={section.id}>
              <div className="info-editor-fields">
                <div className="info-editor-head">
                  <strong>{draft.titleEn || section.key}</strong>
                  <button
                    type="button"
                    className={draft.isEnabled ? 'status status-active' : 'status status-inactive'}
                    onClick={() => edit(section.id, { isEnabled: !draft.isEnabled })}
                  >
                    {draft.isEnabled ? t('enabled') : t('disabled')}
                  </button>
                </div>

                {/* English is the fallback the other two resolve to, so it is the only
                    one the API requires. */}
                <label>{t('nameEn')}
                  <input value={draft.titleEn} onChange={e => edit(section.id, { titleEn: e.target.value })} />
                </label>
                <label>{t('nameKa')}
                  <input value={draft.titleKa} onChange={e => edit(section.id, { titleKa: e.target.value })} />
                </label>

                <label>{t('textEn')}
                  <textarea rows={5} value={draft.bodyEn} onChange={e => edit(section.id, { bodyEn: e.target.value })} />
                </label>
                <label>{t('textKa')}
                  <textarea rows={5} value={draft.bodyKa} onChange={e => edit(section.id, { bodyKa: e.target.value })} />
                </label>

                <button
                  className="btn btn-dark"
                  onClick={() => save(section.id)}
                  disabled={savingId === section.id}
                >
                  {savingId === section.id ? '...' : savedId === section.id ? t('saved') : t('save')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
