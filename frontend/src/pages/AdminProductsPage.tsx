import { Edit3, Plus, Tag, Trash2, X } from 'lucide-react';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Product } from '../types';
import { lari, localizedName } from '../utils/format';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [discountMode, setDiscountMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [percentage, setPercentage] = useState('');
  const [saving, setSaving] = useState(false);
  // The product waiting for the delete confirmation, if any.
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { t, language } = useI18n();

  const load = () => { api.products(undefined, true).then(setProducts).catch(() => setProducts([])); };
  useEffect(load, []);

  const enterDiscountMode = () => {
    setDiscountMode(true);
    setSelected(new Set(products.map(p => p.id)));
    setPercentage('');
  };

  const exitDiscountMode = () => {
    setDiscountMode(false);
    setSelected(new Set());
    setPercentage('');
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p.id)));
  };

  const applyDiscount = async () => {
    const pct = Number(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100 || selected.size === 0) return;
    setSaving(true);
    try {
      await api.bulkDiscount([...selected], pct);
      load();
      exitDiscountMode();
    } finally {
      setSaving(false);
    }
  };

  /** Shows or hides the product in the shop; nothing is deleted. */
  const toggleActive = async (product: Product) => {
    const updated = await api.setProductActive(product.id, !product.isActive);
    setProducts(current => current.map(item => (item.id === updated.id ? updated : item)));
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteProduct(toDelete.id);
      setProducts(current => current.filter(item => item.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="admin-heading row">
        <div>
          <p className="eyebrow">{t('catalog')}</p>
          <h1>{t('products')}</h1>
        </div>
        <div className="admin-heading-actions">
          {discountMode ? (
            <>
              <label className="select-all-label">
                <input type="checkbox" checked={selected.size === products.length} onChange={toggleAll} />
                {selected.size} selected
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                placeholder="Discount %"
                className="discount-input"
              />
              <button
                className="btn btn-dark"
                onClick={applyDiscount}
                disabled={saving || selected.size === 0 || percentage === ''}
              >
                {saving ? '…' : 'Save'}
              </button>
              <button className="btn btn-outline" onClick={exitDiscountMode}><X size={16} /></button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={enterDiscountMode}><Tag size={16} />Add Discount</button>
              <Link className="btn btn-dark" to="/admin/products/new"><Plus size={18} />{t('addProduct')}</Link>
            </>
          )}
        </div>
      </div>

      <div className="admin-table">
        {products.map(product => (
          <article
            key={product.id}
            className={`admin-row ${discountMode && selected.has(product.id) ? 'admin-row-selected' : ''}`}
            onClick={discountMode ? () => toggleSelect(product.id) : undefined}
            style={discountMode ? { cursor: 'pointer' } : undefined}
          >
            {discountMode && (
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggleSelect(product.id)}
                onClick={e => e.stopPropagation()}
                className="row-checkbox"
              />
            )}
            <img src={product.images[0]?.url} alt={product.name} />
            <div>
              <strong>{product.name}</strong>
              <span>
                {product.category ? localizedName(product.category, language) : ''} ·{' '}
                {product.discountPrice != null ? (
                  <><s style={{ color: 'var(--muted)' }}>{lari(product.price)}</s> {lari(product.discountPrice)}</>
                ) : lari(product.price)}
              </span>
            </div>
            {discountMode ? (
              <span className={product.isActive ? 'status active' : 'status'}>
                {product.isActive ? t('active') : t('inactive')}
              </span>
            ) : (
              // One click turns the product on or off in the shop.
              <button
                type="button"
                className={product.isActive ? 'status active status-toggle' : 'status status-toggle'}
                onClick={() => toggleActive(product)}
                title={product.isActive ? t('deactivate') : t('activate')}
              >
                {product.isActive ? t('active') : t('inactive')}
              </button>
            )}
            {!discountMode && (
              <>
                <Link className="icon-link" to={`/admin/products/${product.id}`} onClick={e => e.stopPropagation()} title={t('edit')}><Edit3 size={18} /></Link>
                <button
                  className="icon-danger"
                  onClick={() => { setDeleteError(''); setToDelete(product); }}
                  title={t('delete')}
                  aria-label={`${t('delete')} ${product.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </article>
        ))}
      </div>

      {toDelete && (
        <ConfirmDeleteDialog
          name={toDelete.name}
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
