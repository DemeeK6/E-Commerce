import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, Product } from '../types';

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

const blank = {
  name: '',
  description: '',
  price: 0,
  discountPrice: null,
  categoryId: 0,
  genderTarget: 0 as const,
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [{ id: 0, name: 'Black', hexCode: '#111111' }],
  images: [{ id: 0, url: '', altText: '', isPrimary: true, sortOrder: 0 }],
  stockQuantity: 0,
  isActive: true,
};

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Partial<Product> & { categoryId: number }>(blank);
  const [sizeInput, setSizeInput] = useState('');
  const [colorsText, setColorsText] = useState('Black:#111111');

  useEffect(() => {
    api.categories('').then(items => {
      setCategories(items);
      setForm(current => ({ ...current, categoryId: current.categoryId || items[0]?.id || 0 }));
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    api.product(id).then(product => {
      setForm({ ...product, categoryId: product.category?.id || 0 });
      setColorsText(product.colors.map(c => `${c.name}:${c.hexCode}`).join(', '));
    });
  }, [id]);

  const addSize = (size: string) => {
    const trimmed = size.trim().toUpperCase();
    if (!trimmed) return;
    const current = form.sizes ?? [];
    if (current.includes(trimmed)) return;
    setForm(f => ({ ...f, sizes: [...current, trimmed] }));
    setSizeInput('');
  };

  const removeSize = (size: string) => {
    setForm(f => ({ ...f, sizes: (f.sizes ?? []).filter(s => s !== size) }));
  };

  const onSizeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addSize(sizeInput); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const colors = colorsText.split(',').map(item => {
      const [name, hexCode = '#111111'] = item.trim().split(':');
      return { id: 0, name: name.trim(), hexCode };
    }).filter(c => c.name);
    await api.saveProduct({
      ...form,
      sizes: form.sizes ?? [],
      colors,
      images: form.images?.[0]?.url ? form.images : [],
    });
    navigate('/admin/products');
  };

  const sizes = form.sizes ?? [];

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-heading">
        <p className="eyebrow">{t('productEditor')}</p>
        <h1>{id ? t('editProduct') : t('createProduct')}</h1>
      </div>

      <label>{t('name')}<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
      <label>{t('description')}<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} /></label>

      <div className="two-fields">
        <label>{t('price')}<input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required /></label>
        <label>{t('discountPrice')}<input type="number" value={form.discountPrice ?? ''} onChange={e => setForm({ ...form, discountPrice: e.target.value ? Number(e.target.value) : null })} /></label>
      </div>

      <div className="two-fields">
        <label>{t('category')}
          <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>{t('stock')}<input type="number" value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: Number(e.target.value) })} /></label>
      </div>

      <div className="form-field">
        <span className="field-label">{t('sizes')}</span>
        <div className="size-quick-picks">
          {COMMON_SIZES.map(s => (
            <button
              key={s}
              type="button"
              className={`size-chip ${sizes.includes(s) ? 'size-chip-active' : ''}`}
              onClick={() => sizes.includes(s) ? removeSize(s) : addSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="size-add-row">
          <input
            value={sizeInput}
            onChange={e => setSizeInput(e.target.value)}
            onKeyDown={onSizeKeyDown}
            placeholder="Custom size (e.g. 32W, 34L)…"
            className="size-custom-input"
          />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => addSize(sizeInput)}>+</button>
        </div>
        {sizes.length > 0 && (
          <div className="size-selected">
            {sizes.map(s => (
              <span key={s} className="size-tag">
                {s}
                <button type="button" onClick={() => removeSize(s)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label>{t('colors')}<input value={colorsText} onChange={e => setColorsText(e.target.value)} /></label>
      <label>{t('primaryImageUrl')}<input value={form.images?.[0]?.url ?? ''} onChange={e => setForm({ ...form, images: [{ id: 0, url: e.target.value, altText: form.name ?? '', isPrimary: true, sortOrder: 0 }] })} /></label>
      <label className="check-line"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> {t('active')}</label>
      <button className="btn btn-dark" type="submit">{t('saveProduct')}</button>
    </form>
  );
}
