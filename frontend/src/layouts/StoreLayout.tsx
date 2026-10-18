import { Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useI18n } from '../context/I18nContext';
import { ShopContact } from '../components/ShopContact';
import { api } from '../services/api';
import type { AppSetting, GenderTarget } from '../types';

export function StoreLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const { language, setLanguage, t } = useI18n();
  const { chosen, setCurrency, rate } = useCurrency();
  // Loaded once in the layout so the footer shows the same details on every page.
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    api.settings()
      .then(setSettings)
      .catch(() => setSettings([]))
      .finally(() => setSettingsLoaded(true));
  }, []);

  const nav = (
    <>
      <NavLink to="/" onClick={() => setOpen(false)}>{t('home')}</NavLink>
      <NavLink to="/products" onClick={() => setOpen(false)}>{t('products')}</NavLink>
      <NavLink to="/sizes" onClick={() => setOpen(false)}>{t('sizes')}</NavLink>
      <NavLink to="/info" onClick={() => setOpen(false)}>{t('info')}</NavLink>
      {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)}>{t('adminPanel')}</NavLink>}
      {user ? (
        <button className="link-button" onClick={() => { logout(); setOpen(false); }}>{t('logout')}</button>
      ) : (
        <>
          <NavLink to="/login" onClick={() => setOpen(false)}>{t('login')}</NavLink>
          <NavLink to="/register" onClick={() => setOpen(false)}>{t('register')}</NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="logo" to="/">
          <img src="/Sofio_Logo.jpg" alt="Sofio Logo" style={{ height: '40px', objectFit: 'contain' }} />
          SOFIO
        </Link>
        <nav className="desktop-nav">{nav}</nav>
        <div className="header-actions">
          {/* Lari is offered only once today's rate is known, so no price is ever a guess. */}
          <select
            value={rate ? chosen : 'USD'}
            onChange={event => setCurrency(event.target.value as 'USD' | 'GEL')}
            aria-label={t('currency')}
            title={rate ? `1 USD = ${rate.usdToGel} GEL` : t('currencyUnavailable')}
          >
            <option value="USD">USD $</option>
            <option value="GEL" disabled={!rate}>GEL ₾</option>
          </select>
          <select value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'ka' | 'ru')} aria-label="Language">
            <option value="en">EN</option>
            <option value="ka">KA</option>
            <option value="ru">RU</option>
          </select>
          <Link className="icon-link" to="/cart" aria-label={t('cart')}>
            <ShoppingBag size={20} />
            {count > 0 && <span>{count}</span>}
          </Link>
          {user ? (
            <div className="profile-menu">
              <Link className="icon-link" to="/profile" aria-label={t('profile')}><UserRound size={20} /></Link>
              <button className="link-button" onClick={logout}>{t('logout')}</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login">{t('login')}</Link>
              <Link className="btn btn-dark" to="/register">{t('register')}</Link>
            </div>
          )}
          <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {open && <nav className="mobile-nav">{nav}</nav>}
      <main>
        <Outlet context={{ settings, settingsLoaded } satisfies StoreOutletContext} />
      </main>
      <footer className="site-footer">
        <div>
          <strong>SOFIO</strong>
        </div>
        <ShopContact settings={settings} />
        <div>
          <Link to="/products">{t('products')}</Link>
          <Link to="/sizes">{t('sizes')}</Link>
          <Link to="/info">{t('info')}</Link>
          <Link to="/cart">{t('cart')}</Link>
          <Link to="/login">{t('login')}</Link>
        </div>
      </footer>
    </div>
  );
}

/** What StoreLayout hands to the pages inside it (read with useStoreSettings). */
export interface StoreOutletContext {
  settings: AppSetting[];
  settingsLoaded: boolean;
}

export function useStoreSettings() {
  return useOutletContext<StoreOutletContext>();
}

const GENDER_SETTING_KEYS: Record<GenderTarget, string> = { 0: 'enable_men', 1: 'enable_women', 2: 'enable_kids' };

/**
 * The genders switched on in Admin -> Settings, in Men, Women, Kids order. If the
 * settings could not be loaded, Men only - the shop's original catalogue.
 */
export function enabledGenders(settings: AppSetting[]): GenderTarget[] {
  if (settings.length === 0) return [0];
  return ([0, 1, 2] as GenderTarget[]).filter(
    gender => settings.find(setting => setting.key === GENDER_SETTING_KEYS[gender])?.isEnabled,
  );
}
