import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await register(firstName, lastName, email, password, phone);
      navigate('/profile');
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{t('createAccount')}</p>
        <h1>{t('register')}</h1>
        <div className="two-fields">
          <label>{t('firstName')}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
          <label>{t('lastName')}<input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
        </div>
        <label>{t('email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>{t('phone')}<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" required /></label>
        <label>{t('password')}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-dark btn-full" type="submit">{t('register')}</button>
        <p className="auth-meta"><Link to="/login">{t('login')}</Link></p>
      </form>
    </section>
  );
}
