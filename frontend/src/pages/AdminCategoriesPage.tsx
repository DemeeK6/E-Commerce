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
  // The category being deleted, if any. It drives one dialog with two shapes: a
  // plain confirmation when it is empty, a destination picker when it still holds
  // products. Null means no deletion is being decided.
  const [movingFrom, setMovingFrom] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState<number | ''>('');
  const [deleting, setDeleting] = useState(false);
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

  // Both cases open the same dialog rather than one using the browser's own
  // confirm box, which looks nothing like the rest of the admin panel.
  const remove = (category: Category) => {
    setError('');
    setMoveTo('');
    setMovingFrom(category);
  };

  const destroy = async (id: number, moveProductsTo?: number) => {
    setDeleting(true);
    setError('');
    try {
      await api.deleteCategory(id, moveProductsTo);
      // Editing the row that was just deleted would post to a missing id.
      if (editing?.id === id) cancelEdit();
      setMovingFrom(null);
      load();
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setDeleting(false);
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
              <span>
                {category.slug} · {t(GENDER_OPTIONS[category.genderTarget].labelKey)}
                {category.productCount > 0 && ` · ${category.productCount} ${t('products').toLowerCase()}`}
              </span>
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
              <button className="btn btn-ghost btn-sm" onClick={() => remove(category)}>
                {t('deleteCategory')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {movingFrom && (
        <div className="modal-backdrop" onClick={() => !deleting && setMovingFrom(null)}>
          <div
            className="modal-card move-products-card"
            role="dialog"
            aria-modal="true"
            aria-label={movingFrom.productCount > 0 ? t('moveProductsTitle') : t('deleteCategoryTitle')}
            onClick={event => event.stopPropagation()}
          >
            <h2>{movingFrom.productCount > 0 ? t('moveProductsTitle') : t('deleteCategoryTitle')}</h2>
            <p className="size-chart-note">
              {movingFrom.productCount > 0
                ? t('moveProductsIntro')
                    .replace('{count}', String(movingFrom.productCount))
                    .replace('{name}', movingFrom.nameEn)
                : t('deleteCategoryIntro').replace('{name}', movingFrom.nameEn)}
            </p>

            {movingFrom.productCount > 0 && (
              <>
                <label>{t('moveProductsTo')}
                  <select value={moveTo} onChange={event => setMoveTo(Number(event.target.value))}>
                    <option value="">{t('chooseCategory')}</option>
                    {categories
                      .filter(candidate => candidate.id !== movingFrom.id)
                      .map(candidate => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.nameEn} · {t(GENDER_OPTIONS[candidate.genderTarget].labelKey)}
                        </option>
                      ))}
                  </select>
                </label>

                {/* Moving across genders is allowed, but the products take on the new
                    category's gender, so say so rather than letting it surprise her. */}
                {moveTo !== '' && categories.find(c => c.id === moveTo)?.genderTarget !== movingFrom.genderTarget && (
                  <p className="move-products-warning">{t('moveProductsGenderWarning')}</p>
                )}
              </>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="transfer-actions">
              <button
                className="btn btn-dark btn-full"
                disabled={deleting || (movingFrom.productCount > 0 && moveTo === '')}
                onClick={() => destroy(
                  movingFrom.id,
                  movingFrom.productCount > 0 ? Number(moveTo) : undefined,
                )}
              >
                {deleting
                  ? '...'
                  : movingFrom.productCount > 0 ? t('moveAndDelete') : t('deleteCategory')}
              </button>
              <button className="btn btn-outline btn-full" disabled={deleting} onClick={() => setMovingFrom(null)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
