import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, Color, Product, ProductColor, ProductImage } from '../types';
import { localizedName } from '../utils/format';

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

const blank = {
  name: '',
  description: '',
  price: 0,
  discountPrice: null,
  categoryId: 0,
  genderTarget: 0 as const,
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [] as ProductColor[],
  images: [] as ProductImage[],
  stockQuantity: 0,
  isActive: true,
};

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [colorsList, setColorsList] = useState<Color[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [form, setForm] = useState<Partial<Product> & { categoryId: number }>(blank);
  const [sizeInput, setSizeInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.categories('').then(items => {
      setCategories(items);
      setForm(current => ({ ...current, categoryId: current.categoryId || items[0]?.id || 0 }));
    });
  }, []);

  useEffect(() => {
    api.colors().then(setColorsList).catch(() => setColorsList([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.product(id).then(product => {
      setForm({ ...product, categoryId: product.category?.id || 0 });
      setSelectedColorIds(product.colors.map(c => c.colorId));
    });
  }, [id]);

  const enabledColors = colorsList.filter(c => c.isEnabled);

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

  const toggleColor = (colorId: number) => {
    setSelectedColorIds(current =>
      current.includes(colorId) ? current.filter(cid => cid !== colorId) : [...current, colorId]);
  };

  const handleImageFile = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const url = await api.uploadImage(file);
      setForm(f => {
        const images = f.images ?? [];
        return {
          ...f,
          images: [...images, {
            id: 0,
            url,
            altText: f.name ?? '',
            isPrimary: images.length === 0,
            sortOrder: images.length,
            colorId: null,
          }],
        };
      });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    for (const file of selected) {
      await handleImageFile(file);
    }
  };

  const setPrimaryImage = (index: number) => {
    setForm(f => ({
      ...f,
      images: (f.images ?? []).map((image, i) => ({ ...image, isPrimary: i === index })),
    }));
  };

  const setImageColor = (index: number, colorId: number | null) => {
    setForm(f => ({
      ...f,
      images: (f.images ?? []).map((image, i) => (i === index ? { ...image, colorId } : image)),
    }));
  };

  const removeImage = (index: number) => {
    setForm(f => {
      const current = f.images ?? [];
      const wasPrimary = current[index]?.isPrimary ?? false;
      const remaining = current.filter((_, i) => i !== index);
      if (wasPrimary && remaining.length > 0 && !remaining.some(image => image.isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return { ...f, images: remaining };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    const colors: ProductColor[] = selectedColorIds
      .map(colorId => colorsList.find(c => c.id === colorId))
      .filter((c): c is Color => Boolean(c))
      .map(c => ({ id: 0, colorId: c.id, nameEn: c.nameEn, nameKa: c.nameKa, nameRu: c.nameRu, hexCode: c.hexCode }));
    try {
      await api.saveProduct({
        ...form,
        sizes: form.sizes ?? [],
        colors,
        images: (form.images ?? []).filter(image => image.url.trim() !== ''),
      });
      navigate('/admin/products');
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  };

  const sizes = form.sizes ?? [];
  const images = form.images ?? [];

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
            {categories.map(c => <option key={c.id} value={c.id}>{localizedName(c, language)}</option>)}
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

      <div className="form-field">
        <span className="field-label">{t('colors')}</span>
        <div className="color-quick-picks">
          {enabledColors.map(color => (
            <button
              key={color.id}
              type="button"
              className={`color-chip ${selectedColorIds.includes(color.id) ? 'color-chip-active' : ''}`}
              onClick={() => toggleColor(color.id)}
            >
              <i style={{ background: color.hexCode }} />
              {localizedName(color, language)}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <span className="field-label">{t('addImage')}</span>
        <div className="image-thumbs">
          {images.map((image, index) => (
            <div key={index} className={`image-thumb ${image.isPrimary ? 'image-thumb-primary' : ''}`}>
              <img src={image.url} alt={image.altText || ''} className="image-thumb-img" />
              <label className="image-color-label">
                {t('assignColor')}
                <select
                  value={image.colorId ?? ''}
                  onChange={e => setImageColor(index, e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{t('noColor')}</option>
                  {enabledColors.map(color => (
                    <option key={color.id} value={color.id}>{localizedName(color, language)}</option>
                  ))}
                </select>
              </label>
              <div className="image-thumb-actions">
                <button
                  type="button"
                  className={`btn btn-sm ${image.isPrimary ? 'btn-dark' : 'btn-outline'}`}
                  onClick={() => setPrimaryImage(index)}
                  disabled={image.isPrimary}
                  title="Primary image"
                >
                  <Star size={14} fill={image.isPrimary ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeImage(index)}>
                  {t('removeImage')}
                </button>
              </div>
            </div>
          ))}
          <div className="image-upload-area image-upload-add" onClick={() => fileInputRef.current?.click()}>
            <div className="image-placeholder">
              <span>{t('addImage')}</span>
              <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>JPG, PNG, WebP · max 5 MB</span>
            </div>
            {uploading && <div className="image-uploading">Uploading…</div>}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          style={{ display: 'none' }}
          onChange={e => { const files = e.target.files; handleFilesSelected(files); e.target.value = ''; }}
        />
        {uploadError && <p className="form-error">{uploadError}</p>}
      </div>
      <label className="check-line"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> {t('active')}</label>
      {submitError && <p className="form-error">{submitError}</p>}
      <button className="btn btn-dark" type="submit">{t('saveProduct')}</button>
    </form>
  );
}
