import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, Product } from '../types';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    api.categories(0).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.products(0, false, search || undefined)
      .then(items => setProducts(categoryId ? items.filter(item => item.category?.id === Number(categoryId)) : items))
      .catch(() => setProducts([]));
  }, [categoryId, search]);

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('menCollection')}</p>
          <h1>{t('products')}</h1>
        </div>
      </div>
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <label className="search-label">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchProducts')}
              className="search-input"
            />
          </label>
          <p className="sidebar-title">{t('categories')}</p>
          <ul className="category-list">
            <li>
              <button
                type="button"
                className={categoryId === '' ? 'category-link active' : 'category-link'}
                aria-pressed={categoryId === ''}
                onClick={() => setCategoryId('')}
              >
                {t('allCategories')}
              </button>
            </li>
            {categories.map(category => (
              <li key={category.id}>
                <button
                  type="button"
                  className={categoryId === String(category.id) ? 'category-link active' : 'category-link'}
                  aria-pressed={categoryId === String(category.id)}
                  onClick={() => setCategoryId(String(category.id))}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="product-grid">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
}
