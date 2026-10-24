import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { SizeChart } from './SizeChart';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** `gender` picks the chart for the product being viewed. */
export function SizeGuideModal({ gender, onClose }: { gender: 'women' | 'men'; onClose: () => void }) {
  const { t } = useI18n();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const cardRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const card = cardRef.current;
      if (!card) return;
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !card.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !card.contains(active)) {
          event.preventDefault();
          first.focus();
        }
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

  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => { downOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={event => { if (downOnBackdrop.current && event.target === event.currentTarget) closeRef.current(); }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('sizeGuide')}
        ref={cardRef}
        onClick={event => event.stopPropagation()}
      >
        <button
          className="modal-close"
          ref={closeButtonRef}
          onClick={() => closeRef.current()}
          aria-label={t('close')}
        >
          <X size={18} />
        </button>
        <div className="size-page-heading">
          <h2>{t('sizeGuide')}</h2>
          <p className="size-chart-note">{t('sizeChartIntro')}</p>
        </div>
        <SizeChart gender={gender} />
      </div>
    </div>
  );
}
