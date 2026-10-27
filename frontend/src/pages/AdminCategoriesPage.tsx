import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, GenderTarget } from '../types';

const GENDER_OPTIONS: { value: GenderTarget; labelKey: 'men' | 'women' | 'kids' }[] = [
  { value: 0, labelKey: 'men' },
  { value: 1, labelKey: 'women' },
  { value: 2, labelKey: 'kids' },
];

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameKa, setNameKa] = useState('');
  const [genderTarget, setGenderTarget] = useState<GenderTarget>(0);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const { t } = useI18n();

  // Omitting the gender returns every gender; passing includeDisabled also returns
  // the hidden ones, which only an admin receives.
  const load = () => {
    api.categories('', true)
      .then(setCategories)
      .catch(() => setCategories([]));
  };
  useEffect(load, []);

  const resetForm = () => {
    setNameEn('');
    setNameKa('');
    setGenderTarget(0);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.saveCategory({ ...editing, nameEn, nameKa, genderTarget });
        setEditing(null);
      } else {
        // No slug: the API derives it from the name and gender, so it can never
        // disagree with them after a rename or a move between genders.
        await api.saveCategory({
          nameEn,
          nameKa,
          genderTarget,
          isEnabled: true,
          displayOrder: categories.filter(c => c.genderTarget === genderTarget).length + 1,
        });
      }
      resetForm();
      load();
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setNameEn(category.nameEn);
    setNameKa(category.nameKa);
    setGenderTarget(category.genderTarget);
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
    resetForm();
  };

  const remove = async (id: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    setError('');
    try {
      await api.deleteCategory(id);
      // Editing the row that was just deleted would post to a missing id.
      if (editing?.id === id) cancelEdit();
      load();
    } catch (exception) {
      // The API refuses to delete a category that still holds products, and says
      // how many. Swallowing that left the button looking broken.
      setError((exception as Error).message);
    }
  };

  const toggleEnabled = async (category: Category) => {
    setError('');
    try {
      await api.saveCategory({ ...category, isEnabled: !category.isEnabled });
      load();
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('catalogGroups')}</p>
        <h1>{t('categories')}</h1>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input
          value={nameEn}
          onChange={event => setNameEn(event.target.value)}
          placeholder={t('nameEn')}
          required
        />
        <input
          value={nameKa}
          onChange={event => setNameKa(event.target.value)}
          placeholder={t('nameKa')}
        />
        <select
          value={genderTarget}
          onChange={event => setGenderTarget(Number(event.target.value) as GenderTarget)}
        >
          {GENDER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
          ))}
        </select>
        <button className="btn btn-dark" type="submit">
          {editing ? t('saveProduct') : t('addCategory')}
        </button>
        {editing && (
          <button className="btn btn-outline" type="button" onClick={cancelEdit}>✕</button>
        )}
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table">
        {categories.map(category => (
          <article className="admin-row admin-row-text" key={category.id}>
            <div>
              <strong>{category.nameEn}</strong>
              <span>{category.nameKa || '—'}</span>
              <span>{category.slug} · {t(GENDER_OPTIONS[category.genderTarget].labelKey)}</span>
            </div>
            <div className="admin-row-actions">
              <button
                className={category.isEnabled ? 'status active' : 'status'}
                onClick={() => toggleEnabled(category)}
                style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
              >
                {category.isEnabled ? t('enabled') : t('disabled')}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => startEdit(category)}>
                {t('editCategory')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(category.id)}>
                {t('deleteCategory')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
