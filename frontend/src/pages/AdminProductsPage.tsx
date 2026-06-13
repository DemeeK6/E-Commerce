import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Product } from '../types';
import { money } from '../utils/format';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { t } = useI18n();
  const load = () => { api.products(0, true).then(setProducts).catch(() => setProducts([])); };

  useEffect(load, []);

  const deactivate = async (id: number) => {
    await api.deleteProduct(id);
    load();
  };

  return (
    <div>
      <div className="admin-heading row">
        <div>
          <p className="eyebrow">{t('catalog')}</p>
          <h1>{t('products')}</h1>
        </div>
        <Link className="btn btn-dark" to="/admin/products/new"><Plus size={18} />{t('addProduct')}</Link>
      </div>
      <div className="admin-table">
        {products.map(product => (
          <article key={product.id} className="admin-row">
            <img src={product.images[0]?.url} alt={product.name} />
            <div><strong>{product.name}</strong><span>{product.category?.name} · {money(product.discountPrice ?? product.price)}</span></div>
            <span className={product.isActive ? 'status active' : 'status'}>{product.isActive ? t('active') : t('inactive')}</span>
            <Link className="icon-link" to={`/admin/products/${product.id}`}><Edit3 size={18} /></Link>
            <button className="icon-danger" onClick={() => deactivate(product.id)}><Trash2 size={18} /></button>
          </article>
        ))}
      </div>
    </div>
  );
}
