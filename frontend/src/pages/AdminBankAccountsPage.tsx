import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { BankAccount } from '../types';

const BANK_LABEL = { 0: 'bankTbc', 1: 'bankBog' } as const;

// The seeder writes this so an unconfigured account is obvious rather than looking real.
const PLACEHOLDER_HOLDER = 'REPLACE ME';

export function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BankAccount>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);
  const { t } = useI18n();

  const load = () =>
    api.bankAccounts(true)
      .then(items => {
        setAccounts(items);
        setDrafts(Object.fromEntries(items.map(item => [item.id, item])));
      })
      .catch(() => setAccounts([]));

  useEffect(() => { load(); }, []);

  const edit = (id: number, patch: Partial<BankAccount>) =>
    setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }));

  const save = async (id: number) => {
    setSaving(id);
    setError('');
    try {
      const updated = await api.saveBankAccount(drafts[id]);
      setAccounts(current => current.map(a => (a.id === id ? updated : a)));
      setDrafts(current => ({ ...current, [id]: updated }));
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const needsSetup = accounts.some(account => account.accountHolder === PLACEHOLDER_HOLDER);

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('storeControl')}</p>
        <h1>{t('bankAccounts')}</h1>
      </div>

      <p className="size-chart-note">{t('bankAccountsIntro')}</p>
      {needsSetup && <p className="bank-setup-warning">{t('bankAccountsPlaceholderWarning')}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="admin-table">
        {accounts.map(account => {
          const draft = drafts[account.id] ?? account;
          return (
            <article className="admin-row bank-account-row" key={account.id}>
              <div className="bank-account-fields">
                <strong>{t(BANK_LABEL[account.bank])}</strong>
                <label>{t('accountHolder')}
                  <input value={draft.accountHolder} onChange={e => edit(account.id, { accountHolder: e.target.value })} />
                </label>
                <label>{t('iban')}
                  <input value={draft.iban} onChange={e => edit(account.id, { iban: e.target.value })} />
                </label>
                <label>{t('acceptedCurrencies')}
                  <input value={draft.currencies} onChange={e => edit(account.id, { currencies: e.target.value })} />
                </label>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className={draft.isEnabled ? 'status status-active' : 'status status-inactive'}
                  onClick={() => edit(account.id, { isEnabled: !draft.isEnabled })}
                >
                  {draft.isEnabled ? t('enabled') : t('disabled')}
                </button>
                <button className="btn btn-dark" onClick={() => save(account.id)} disabled={saving === account.id}>
                  {saving === account.id ? '...' : savedId === account.id ? t('saved') : t('save')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
