import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/profile');
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{t('welcomeBack')}</p>
        <h1>{t('login')}</h1>
        <label>{t('email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>{t('password')}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-dark btn-full" type="submit">{t('login')}</button>
        <div className="auth-meta">
          <Link to="/reset-password">{t('resetPassword')}</Link>
          <Link to="/register">{t('register')}</Link>
        </div>
      </form>
    </section>
  );
}
