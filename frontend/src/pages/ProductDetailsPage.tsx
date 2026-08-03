import { Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Product } from '../types';
import { money } from '../utils/format';
import { SizeGuideModal } from '../components/SizeGuideModal';

export function ProductDetailsPage() {
  const { id } = useParams();
  const { add } = useCart();
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.product(id).then(item => {
      setProduct(item);
      setSize(item.sizes[0] || 'M');
      setColor(item.colors[0]?.name || 'Black');
    });
  }, [id]);

  if (!product) {
    return <section className="section">{t('loadingProduct')}</section>;
  }

  return (
    <section className="section detail-page">
      <div className="gallery">
        <img src={product.images[0]?.url} alt={product.name} />
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{product.category?.name || t('menswear')}</p>
        <h1>{product.name}</h1>
        <div className="detail-price">
          <strong>{money(product.discountPrice ?? product.price)}</strong>
          {product.discountPrice && <span>{money(product.price)}</span>}
        </div>
        <p>{product.description}</p>
        <div className="option-group">
          <span>{t('size')}</span>
          <div>{product.sizes.map(item => <button className={size === item ? 'selected' : ''} key={item} onClick={() => setSize(item)}>{item}</button>)}</div>
          <button className="size-guide-link" onClick={() => setGuideOpen(true)}>
            <Ruler size={16} />
            {t('sizeGuide')}
          </button>
        </div>
        <div className="option-group">
          <span>{t('color')}</span>
          <div>{product.colors.map(item => <button className={color === item.name ? 'selected swatch' : 'swatch'} key={item.id} onClick={() => setColor(item.name)}><i style={{ background: item.hexCode }} />{item.name}</button>)}</div>
        </div>
        <div className="quantity-control">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button>
        </div>
        <button className="btn btn-dark btn-wide" onClick={() => add(product, quantity, size, color)}>
          <ShoppingBag size={18} />
          {t('addToCart')}
        </button>
      </div>
      {guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}
    </section>
  );
}
