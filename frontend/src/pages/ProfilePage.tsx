import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useI18n();

  return (
    <section className="section profile-page">
      <div className="profile-card">
        <p className="eyebrow">{t('customerProfile')}</p>
        <h1>{user?.firstName} {user?.lastName}</h1>
        <p>{user?.email}</p>
        {user?.phone && <p>{t('phone')}: {user.phone}</p>}
        <p>{t('roles')}: {user?.roles.join(', ')}</p>
        <div className="profile-actions">
          <Link className="btn btn-outline" to="/orders">
            <Package size={16} />
            {t('myOrders')}
          </Link>
          {isAdmin && (
            <Link className="btn btn-dark" to="/admin">{t('openAdminPanel')}</Link>
          )}
          <button className="btn btn-ghost" onClick={logout}>{t('logout')}</button>
        </div>
      </div>
    </section>
  );
}
