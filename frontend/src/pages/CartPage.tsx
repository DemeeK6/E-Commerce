import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { money } from '../utils/format';

export function CartPage() {
  const { lines, total, updateQuantity, remove } = useCart();
  const { t } = useI18n();

  return (
    <section className="section cart-page">
      <div className="section-heading"><h1>{t('cart')}</h1></div>
      {lines.length === 0 ? (
        <div className="empty-state">
          <h2>{t('cartEmpty')}</h2>
          <Link className="btn btn-dark" to="/products">{t('continueShopping')}</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map(line => (
              <article className="cart-line" key={line.localId}>
                <img src={line.imageUrl} alt={line.productName} />
                <div>
                  <h3>{line.productName}</h3>
                  <p>{line.size} / {line.color}</p>
                  <strong>{money(line.price)}</strong>
                </div>
                <div className="quantity-control compact">
                  <button onClick={() => updateQuantity(line.localId, line.quantity - 1)}><Minus size={15} /></button>
                  <span>{line.quantity}</span>
                  <button onClick={() => updateQuantity(line.localId, line.quantity + 1)}><Plus size={15} /></button>
                </div>
                <button className="icon-danger" onClick={() => remove(line.localId)} aria-label="Remove"><Trash2 size={18} /></button>
              </article>
            ))}
          </div>
          <aside className="summary-panel">
            <h2>{t('summary')}</h2>
            <div><span>{t('subtotal')}</span><strong>{money(total)}</strong></div>
            <div><span>{t('total')}</span><strong>{money(total)}</strong></div>
            <Link className="btn btn-dark btn-full" to="/checkout">{t('checkout')}</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
