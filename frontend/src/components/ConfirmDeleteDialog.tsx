import { useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';

/**
 * "Delete <name>?" with Cancel and Delete. Cancel has the focus, so pressing Enter by
 * accident never deletes anything; Escape and a click outside also cancel.
 */
export function ConfirmDeleteDialog({
  name,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  name: string;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className="modal-card confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title">
        <h2 id="confirm-delete-title">{t('deleteProductTitle')}</h2>
        <p className="confirm-name">{name}</p>
        <p className="size-chart-note">{t('deleteProductText')}</p>
        {error && <p className="form-error">{error}</p>}
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? '...' : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
