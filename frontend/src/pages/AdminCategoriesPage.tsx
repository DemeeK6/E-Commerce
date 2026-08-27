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
  const [nameRu, setNameRu] = useState('');
  const [genderTarget, setGenderTarget] = useState<GenderTarget>(0);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const { t } = useI18n();

  // `api.categories('')` hits GET /api/categories with no `gender` query param.
  // The backend's `gender` parameter defaults to Men when absent (it's a C#
  // default parameter value, not a true "all genders" option), so that call
  // silently returns only Men categories. Fetch each gender explicitly and
  // merge so the admin can see and manage every category, not just Men.
  const load = () => {
    Promise.all(GENDER_OPTIONS.map(option => api.categories(option.value)))
      .then(results => setCategories(results.flat()))
      .catch(() => setCategories([]));
  };
  useEffect(load, []);

  const resetForm = () => {
    setNameEn('');
    setNameKa('');
    setNameRu('');
    setGenderTarget(0);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.saveCategory({ ...editing, nameEn, nameKa, nameRu, genderTarget });
        setEditing(null);
      } else {
        await api.saveCategory({
          nameEn,
          nameKa,
          nameRu,
          slug: nameEn.toLowerCase().replaceAll(' ', '-'),
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
    setNameRu(category.nameRu);
    setGenderTarget(category.genderTarget);
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
    resetForm();
  };

  const remove = async (id: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    await api.deleteCategory(id);
    load();
  };

  const toggleEnabled = async (category: Category) => {
    await api.saveCategory({ ...category, isEnabled: !category.isEnabled });
    load();
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
        <input
          value={nameRu}
          onChange={event => setNameRu(event.target.value)}
          placeholder={t('nameRu')}
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
              <span>{category.nameKa || '—'} · {category.nameRu || '—'}</span>
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
