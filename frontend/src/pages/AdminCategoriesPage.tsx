import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category } from '../types';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const { t } = useI18n();

  const load = () => { api.categories('').then(setCategories).catch(() => setCategories([])); };
  useEffect(load, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (editing) {
      await api.saveCategory({ ...editing, name });
      setEditing(null);
    } else {
      await api.saveCategory({
        name,
        slug: name.toLowerCase().replaceAll(' ', '-'),
        genderTarget: 0,
        isEnabled: true,
        displayOrder: categories.length + 1,
      });
    }
    setName('');
    load();
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
  };

  const cancelEdit = () => {
    setEditing(null);
    setName('');
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
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={editing ? t('editCategory') : t('newCategoryPlaceholder')}
          required
        />
        <button className="btn btn-dark" type="submit">
          {editing ? t('saveProduct') : t('addCategory')}
        </button>
        {editing && (
          <button className="btn btn-outline" type="button" onClick={cancelEdit}>✕</button>
        )}
      </form>
      <div className="admin-table">
        {categories.map(category => (
          <article className="admin-row" key={category.id}>
            <div><strong>{category.name}</strong><span>{category.slug}</span></div>
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
