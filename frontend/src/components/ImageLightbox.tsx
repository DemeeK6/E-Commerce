import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';

/**
 * Shows photos at full size, uncropped. Everywhere else a product photo is cropped
 * to 4:5, so this is the only place the whole picture is visible - which is the
 * point of it. Used by the shop when a customer taps a photo, and by the admin's
 * "view bigger" button.
 */
export function ImageLightbox({
  images,
  startIndex = 0,
  alt,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(startIndex);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const step = (delta: number) => setIndex(current => (current + delta + count) % count);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeRef.current(); return; }
      if (event.key === 'ArrowRight') { setIndex(c => (c + 1) % count); return; }
      if (event.key === 'ArrowLeft') { setIndex(c => (c - 1 + count) % count); return; }
      if (event.key !== 'Tab') return;

      const card = cardRef.current;
      if (!card) return;
      const focusable = [...card.querySelectorAll<HTMLElement>('button')].filter(el => el.offsetParent !== null);
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
  }, [count]);

  // Swipe on a phone, where reaching for a small arrow is awkward.
  const onTouchStart = (event: React.TouchEvent) => { touchStartX.current = event.touches[0].clientX; };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || count < 2) return;
    const travelled = event.changedTouches[0].clientX - touchStartX.current;
    // Far enough to be a swipe rather than a tap that wandered.
    if (Math.abs(travelled) > 50) step(travelled < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const downOnBackdrop = useRef(false);

  return (
    <div
      className="lightbox-backdrop"
      onMouseDown={event => { downOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={event => { if (downOnBackdrop.current && event.target === event.currentTarget) closeRef.current(); }}
    >
      <div
        className="lightbox-card"
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button className="lightbox-close" ref={closeButtonRef} onClick={() => closeRef.current()} aria-label={t('close')}>
          <X size={20} />
        </button>

        {/* object-fit: contain, so the whole photo is visible however tall it is. */}
        <img className="lightbox-image" src={images[index]} alt={alt} />

        {count > 1 && (
          <>
            <button className="lightbox-arrow lightbox-arrow-prev" onClick={() => step(-1)} aria-label={t('previousImage')}>
              <ChevronLeft size={24} />
            </button>
            <button className="lightbox-arrow lightbox-arrow-next" onClick={() => step(1)} aria-label={t('nextImage')}>
              <ChevronRight size={24} />
            </button>
            <span className="lightbox-counter">{index + 1} / {count}</span>
          </>
        )}
      </div>
    </div>
  );
}
