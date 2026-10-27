import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import type { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { localizedName } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { t, language } = useI18n();
  const { price } = useCurrency();
  const cover = product.images[0];
  const image = cover?.url || 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80';
  const size = product.sizes[0] || 'M';
  const color = product.colors[0] ? localizedName(product.colors[0], language) : 'Black';

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__image">
        {/* The card crops to 4:5, so a tall photo loses its top and bottom unless
            the shop's chosen focus point is honoured. */}
        <img
          src={image}
          alt={cover?.altText || product.name}
          style={cover ? { objectPosition: `${cover.focusX}% ${cover.focusY}%` } : undefined}
        />
        {product.discountPrice && <span className="badge">{t('sale')}</span>}
      </Link>
      <div className="product-card__body">
        <div>
          <p className="muted">{(product.category && localizedName(product.category, language)) || t('menswear')}</p>
          <Link to={`/products/${product.id}`} className="product-title">{product.name}</Link>
        </div>
        <div className="price-row">
          <strong>{price(product.discountPrice ?? product.price)}</strong>
          {product.discountPrice && <span>{price(product.price)}</span>}
        </div>
        <button className="btn btn-dark btn-full" onClick={() => add(product, 1, size, color)}>
          <ShoppingBag size={17} />
          {t('addToCart')}
        </button>
      </div>
    </article>
  );
}
