import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { SizeChart } from './SizeChart';

export function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={() => closeRef.current()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('sizeGuide')}
        onClick={event => event.stopPropagation()}
      >
        <button className="modal-close" onClick={() => closeRef.current()} aria-label={t('close')}>
          <X size={18} />
        </button>
        <div className="size-page-heading">
          <h2>{t('sizeGuide')}</h2>
          <p className="size-chart-note">{t('sizeChartIntro')}</p>
        </div>
        <SizeChart />
      </div>
    </div>
  );
}
