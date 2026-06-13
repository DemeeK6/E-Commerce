import { Search, SlidersHorizontal } from 'lucide-react';
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
        <div className="catalog-filters">
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
          <label className="filter">
            <SlidersHorizontal size={18} />
            <select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
              <option value="">{t('allCategories')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="product-grid">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
