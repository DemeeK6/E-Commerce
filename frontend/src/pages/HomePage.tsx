import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';
import type { Product } from '../types';
import { useI18n } from '../context/I18nContext';

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    api.products(0).then(items => setProducts(items.slice(0, 4))).catch(() => setProducts([]));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <h1>{t('heroTitle')}</h1>
          <Link className="btn btn-light" to="/products">
            {t('shopNow')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

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
