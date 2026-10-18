import { ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeHeroBanner } from '../components/HomeHeroBanner';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';
import type { Product } from '../types';
import { useI18n } from '../context/I18nContext';
import { enabledGenders, useStoreSettings } from '../layouts/StoreLayout';

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { t } = useI18n();

  const { settings, settingsLoaded } = useStoreSettings();

  useEffect(() => {
    if (!settingsLoaded) return;
    // Featured products only from the genders switched on in Admin -> Settings.
    const genders = enabledGenders(settings);
    api.products(undefined)
      .then(items => setProducts(items.filter(item => genders.includes(item.genderTarget)).slice(0, 8)))
      .catch(() => setProducts([]));
  }, [settings, settingsLoaded]);

  return (
    <>
      <HomeHeroBanner />

      <section className="benefit-strip">
        <div><Truck size={20} /> {t('fastDelivery')}</div>
        <div><ShieldCheck size={20} /> {t('secureAccounts')}</div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('newArrivals')}</p>
            <h2>{t('featured')}</h2>
          </div>
          <Link to="/products">{t('products')}</Link>
        </div>
        <div className="product-grid">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  );
}
