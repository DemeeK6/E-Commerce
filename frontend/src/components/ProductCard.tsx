import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import type { Product } from '../types';
import { localizedName, money } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { t, language } = useI18n();
  const image = product.images[0]?.url || 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80';
  const size = product.sizes[0] || 'M';
  const color = product.colors[0] ? localizedName(product.colors[0], language) : 'Black';

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__image">
        <img src={image} alt={product.images[0]?.altText || product.name} />
        {product.discountPrice && <span className="badge">{t('sale')}</span>}
      </Link>
      <div className="product-card__body">
        <div>
          <p className="muted">{(product.category && localizedName(product.category, language)) || t('menswear')}</p>
          <Link to={`/products/${product.id}`} className="product-title">{product.name}</Link>
        </div>
        <div className="price-row">
          <strong>{money(product.discountPrice ?? product.price)}</strong>
          {product.discountPrice && <span>{money(product.price)}</span>}
        </div>
        <button className="btn btn-dark btn-full" onClick={() => add(product, 1, size, color)}>
          <ShoppingBag size={17} />
          {t('addToCart')}
        </button>
      </div>
    </article>
  );
}
