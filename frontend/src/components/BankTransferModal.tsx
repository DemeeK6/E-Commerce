import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import type { BankAccount } from '../types';
import { money } from '../utils/format';

const BANK_LABEL = { 0: 'bankTbc', 1: 'bankBog' } as const;

/**
 * Shown after a bank-transfer order is placed. It is the only place the customer
 * sees where to send the money, so it must survive a reload being impossible -
 * hence the order number and the shop's phone are both on it.
 */
export function BankTransferModal({
  account,
  orderNumber,
  total,
  shopPhone,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  account: BankAccount;
  orderNumber: string;
  total: number;
  shopPhone: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<'iban' | 'reference' | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape deliberately does nothing. Dismissing without choosing would leave the
      // order neither confirmed nor cancelled, which is the state this screen exists
      // to eliminate.
      if (event.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusable = [...card.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  const copy = async (text: string, what: 'iban' | 'reference') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; the value is on screen to copy by hand.
    }
  };

  const reference = orderNumber;

  return (
    // No backdrop dismissal, for the same reason Escape does nothing.
    <div className="modal-backdrop">
      <div className="modal-card transfer-card" role="dialog" aria-modal="true" aria-label={t('payBankTransfer')} ref={cardRef}>
        <button className="modal-close" ref={closeButtonRef} onClick={onCancel} disabled={busy} aria-label={t('cancelOrder')} title={t('cancelOrder')}>
          <X size={18} />
        </button>

        <p className="eyebrow">{t('orderPlaced')}</p>
        <h2>{t('transferInstructionsTitle')}</h2>
        <p className="size-chart-note">{t('transferInstructionsIntro')}</p>

        <ol className="transfer-steps">
          <li>
            <span className="transfer-step-number">1</span>
            <div>
              <p className="transfer-step-label">{t('transferToAccount')}</p>
              <p className="transfer-holder">{account.accountHolder}</p>
              <button type="button" className="copy-field" onClick={() => copy(account.iban, 'iban')}>
                <code>{account.iban}</code>
                {copied === 'iban' ? <Check size={15} /> : <Copy size={15} />}
              </button>
              {account.currencies && <p className="transfer-hint">{t('acceptedCurrencies')}: {account.currencies}</p>}
            </div>
          </li>

          <li>
            <span className="transfer-step-number">2</span>
            <div>
              <p className="transfer-step-label">{t('transferAmount')}</p>
              <p className="transfer-amount">{money(total)}</p>
              <p className="transfer-hint">{t('transferBankName')}: {t(BANK_LABEL[account.bank])}</p>
            </div>
          </li>

          <li>
            <span className="transfer-step-number">3</span>
            <div>
              {/* Without the order number in the description the shop owner sees an
                  anonymous payment in her balance and cannot match it to an order. */}
              <p className="transfer-step-label">{t('transferReference')}</p>
              <button type="button" className="copy-field" onClick={() => copy(reference, 'reference')}>
                <code>{reference}</code>
                {copied === 'reference' ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <p className="transfer-hint">{t('transferReferenceHint')}</p>
            </div>
          </li>
        </ol>

        <p className="transfer-confirm-note">{t('transferConfirmNote')}</p>
        {shopPhone && <p className="transfer-contact">{t('transferQuestions')} <a href={`tel:${shopPhone.replace(/\s/g, '')}`}>{shopPhone}</a></p>}

        {error && <p className="form-error">{error}</p>}

        <p className="transfer-decide-note">{t('transferDecideNote')}</p>
        <div className="transfer-actions">
          <button className="btn btn-dark btn-full" onClick={onConfirm} disabled={busy}>
            {busy ? '...' : t('iHavePaid')}
          </button>
          <button className="btn btn-outline btn-full" onClick={onCancel} disabled={busy}>
            {t('cancelOrder')}
          </button>
        </div>
      </div>
    </div>
  );
}
