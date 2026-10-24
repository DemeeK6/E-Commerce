import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';

/**
 * "2400 × 1350 px" under an uploaded photo, with a warning when it is narrower than
 * the shop will show it - a small photo stretched over a wide banner looks blurry.
 */
export function PhotoSize({ url, minWidth }: { url: string; minWidth: number }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const image = new Image();
    image.onload = () => setSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
  }, [url]);

  if (!size) return null;

  const tooSmall = size.width < minWidth;
  return (
    <span className={tooSmall ? 'photo-size photo-size-warning' : 'photo-size'}>
      {size.width} × {size.height} px{tooSmall && ` · ${t('photoTooSmall')}`}
    </span>
  );
}
