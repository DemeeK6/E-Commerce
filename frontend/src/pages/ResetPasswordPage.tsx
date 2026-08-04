import { FormEvent, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../context/I18nContext';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useI18n();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await api.resetPassword(email);
    setMessage(response.message);
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{t('accountHelp')}</p>
        <h1>{t('resetPassword')}</h1>
        <label>{t('email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <button className="btn btn-dark btn-full" type="submit">{t('resetPassword')}</button>
        {message && <p className="notice">{message}</p>}
      </form>
    </section>
  );
}
