import { Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { ShopContact } from '../components/ShopContact';
import { api } from '../services/api';
import type { AppSetting } from '../types';

export function StoreLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const { language, setLanguage, t } = useI18n();
  // Loaded once in the layout so the footer shows the same details on every page.
  const [settings, setSettings] = useState<AppSetting[]>([]);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => setSettings([]));
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
        <Outlet />
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
