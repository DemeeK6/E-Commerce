import { Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Product, ProductImage } from '../types';
import { localizedName, money } from '../utils/format';
import { SizeGuideModal } from '../components/SizeGuideModal';

export function ProductDetailsPage() {
  const { id } = useParams();
  const { add } = useCart();
  const { t, language } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.product(id).then(item => {
      setProduct(item);
      setSize(item.sizes[0] || 'M');
      setSelectedColorId(item.colors[0]?.colorId ?? null);
    });
  }, [id]);

  // The visible image set is derived from the selected colour, not stored:
  // 1) images tagged with the selected colour, if any exist
  // 2) otherwise every image with no colour assigned
  // 3) otherwise every image on the product
  const galleryImages: ProductImage[] = useMemo(() => {
    if (!product) return [];
    const images = product.images;
    if (selectedColorId != null) {
      const matching = images.filter(image => image.colorId === selectedColorId);
      if (matching.length > 0) return matching;
    }
    const unassigned = images.filter(image => image.colorId === null);
    if (unassigned.length > 0) return unassigned;
    return images;
  }, [product, selectedColorId]);

  // Reset the active image whenever the derived set could have changed.
  useEffect(() => {
    setActiveImageIndex(0);
  }, [product, selectedColorId]);

  if (!product) {
    return <section className="section">{t('loadingProduct')}</section>;
  }

  const activeImage = galleryImages[activeImageIndex] ?? galleryImages[0];
  const selectedProductColor = product.colors.find(item => item.colorId === selectedColorId);
  const cartColorLabel = selectedProductColor ? localizedName(selectedProductColor, language) : 'Black';

  return (
    <section className="section detail-page">
      <div className="gallery">
        <div className="gallery-main">
          {activeImage ? (
            <img src={activeImage.url} alt={activeImage.altText || product.name} />
          ) : (
            <div className="gallery-empty" />
          )}
        </div>
        {galleryImages.length > 1 && (
          <div className="gallery-thumbs">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={image.id}
                className={`gallery-thumb ${index === activeImageIndex ? 'gallery-thumb-active' : ''}`}
                onClick={() => setActiveImageIndex(index)}
              >
                <img src={image.url} alt={image.altText || product.name} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{(product.category && localizedName(product.category, language)) || t('menswear')}</p>
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
          <div>{product.colors.map(item => <button className={selectedColorId === item.colorId ? 'selected swatch' : 'swatch'} key={item.id} onClick={() => setSelectedColorId(item.colorId)}><i style={{ background: item.hexCode }} />{localizedName(item, language)}</button>)}</div>
        </div>
        <div className="quantity-control">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button>
        </div>
        <button className="btn btn-dark btn-wide" onClick={() => add(product, quantity, size, cartColorLabel)}>
          <ShoppingBag size={18} />
          {t('addToCart')}
        </button>
      </div>
      {guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}
    </section>
  );
}
