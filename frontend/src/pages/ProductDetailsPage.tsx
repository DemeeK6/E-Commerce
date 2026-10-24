import { ChevronLeft, ChevronRight, Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Product, ProductImage } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { localizedName } from '../utils/format';
import { SizeGuideModal } from '../components/SizeGuideModal';

export function ProductDetailsPage() {
  const { id } = useParams();
  const { add } = useCart();
  const { t, language } = useI18n();
  const { price } = useCurrency();
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
      // Open on the primary image and select the colour it belongs to, so the
      // swatch matches the photo the customer first sees.
      const firstIndex = Math.max(0, item.images.findIndex(image => image.isPrimary));
      setActiveImageIndex(firstIndex);
      setSelectedColorId(item.images[firstIndex]?.colorId ?? item.colors[0]?.colorId ?? null);
    });
  }, [id]);

  // The gallery always holds every image on the product rather than only the
  // selected colour's. Filtering by colour made the arrows useless in the common
  // case of one photo per colour: the set was always a single image, so there was
  // never anything to page through. Instead the two stay in sync - picking a
  // colour jumps to that colour's first photo, and paging onto a photo that
  // belongs to a colour selects it.
  const galleryImages: ProductImage[] = product?.images ?? [];

  // Selecting a colour moves the gallery to that colour's first photo. A colour
  // with no photo of its own leaves the image where it is - it is still selected
  // for the cart.
  const selectColor = (colorId: number) => {
    setSelectedColorId(colorId);
    const index = galleryImages.findIndex(image => image.colorId === colorId);
    if (index >= 0) setActiveImageIndex(index);
  };

  // Paging with the arrows or thumbnails follows the image: landing on a photo
  // tagged with a colour selects that colour, so the swatch and the picture never
  // disagree. Untagged photos leave the colour choice alone.
  const showImage = (index: number) => {
    setActiveImageIndex(index);
    const colorId = galleryImages[index]?.colorId;
    if (colorId != null) setSelectedColorId(colorId);
  };

  if (!product) {
    return <section className="section">{t('loadingProduct')}</section>;
  }

  // Clamp on read instead of resetting in a passive effect: an effect runs
  // after paint, so on the render where the colour changed but the reset
  // hadn't fired yet, the large image could briefly show a stale frame.
  const activeIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];
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
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-arrow gallery-arrow-prev"
                aria-label={t('previousImage')}
                onClick={() => showImage((activeIndex - 1 + galleryImages.length) % galleryImages.length)}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="gallery-arrow gallery-arrow-next"
                aria-label={t('nextImage')}
                onClick={() => showImage((activeIndex + 1) % galleryImages.length)}
              >
                <ChevronRight size={22} />
              </button>
              <span className="gallery-counter">{activeIndex + 1} / {galleryImages.length}</span>
            </>
          )}
        </div>
        {galleryImages.length > 1 && (
          <div className="gallery-thumbs">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={image.id}
                className={`gallery-thumb ${index === activeIndex ? 'gallery-thumb-active' : ''}`}
                onClick={() => showImage(index)}
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
          <strong>{price(product.discountPrice ?? product.price)}</strong>
          {product.discountPrice && <span>{price(product.price)}</span>}
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
        {product.colors.length > 0 && (
        <div className="option-group">
          <span>{t('color')}</span>
          <div>{product.colors.map(item => <button className={selectedColorId === item.colorId ? 'selected swatch' : 'swatch'} key={item.id} onClick={() => selectColor(item.colorId)}><i style={{ background: item.hexCode }} />{localizedName(item, language)}</button>)}</div>
        </div>
        )}
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
      {/* Women's products get the women's chart; men's and kids' use the men's one. */}
      {guideOpen && (
        <SizeGuideModal gender={product.genderTarget === 1 ? 'women' : 'men'} onClose={() => setGuideOpen(false)} />
      )}
    </section>
  );
}
