import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, GenderTarget, Product } from '../types';
import { localizedName } from '../utils/format';

const GENDER_LABEL_KEYS = { 0: 'men', 1: 'women', 2: 'kids' } as const;

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gender, setGender] = useState<GenderTarget | null>(0);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const { t, language } = useI18n();

  useEffect(() => {
    if (gender === null) {
      setCategories([]);
      return;
    }
    api.categories(gender).then(setCategories).catch(() => setCategories([]));
  }, [gender]);

  useEffect(() => {
    api.products(gender ?? 0, false, search || undefined)
      .then(items => setProducts(categoryId ? items.filter(item => item.category?.id === Number(categoryId)) : items))
      .catch(() => setProducts([]));
  }, [gender, categoryId, search]);

  const selectGender = (next: GenderTarget) => {
    setGender(next);
    setCategoryId('');
  };

  const backToGenders = () => {
    setGender(null);
    setCategoryId('');
  };

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <div>
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
          {gender === null ? (
            <>
              <p className="sidebar-title">{t('categories')}</p>
              <ul className="category-list">
                {([0, 1, 2] as GenderTarget[]).map(genderOption => (
                  <li key={genderOption}>
                    <button
                      type="button"
                      className="category-link"
                      onClick={() => selectGender(genderOption)}
                    >
                      {t(GENDER_LABEL_KEYS[genderOption])}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <button type="button" className="back-link" onClick={backToGenders}>
                ← {t('back')}
              </button>
              <p className="sidebar-title">{t(GENDER_LABEL_KEYS[gender])}</p>
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
                      {localizedName(category, language)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
        <div className="product-grid">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
}
