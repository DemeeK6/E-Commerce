import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { HeroSlide, HomeHero } from '../types';
import { PhotoSize } from './PhotoSize';

const MAX_SLIDES = 10;

/** "Welcome photo" block on the admin Info page: the home page banner's photos and texts. */
export function AdminHeroEditor() {
  const [draft, setDraft] = useState<HomeHero | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    api.homeHero(true).then(setDraft).catch(err => setError((err as Error).message));
  }, []);

  if (!draft) return error ? <p className="form-error">{error}</p> : null;

  const edit = (patch: Partial<HomeHero>) => setDraft(current => (current ? { ...current, ...patch } : current));
  const setSlides = (slides: HeroSlide[]) => edit({ slides });

  /** Clicking the full photo sets the spot the banner must keep in view. */
  const setFocus = (index: number, event: MouseEvent<HTMLImageElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const focusX = Math.round(Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)));
    const focusY = Math.round(Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)));
    setSlides(draft.slides.map((s, i) => (i === index ? { ...s, focusX, focusY } : s)));
  };

  const move = (index: number, by: -1 | 1) => {
    const slides = [...draft.slides];
    [slides[index], slides[index + by]] = [slides[index + by], slides[index]];
    setSlides(slides);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const room = MAX_SLIDES - draft.slides.length;
      const added: HeroSlide[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const imageUrl = await api.uploadImage(file);
        // A negative id is a placeholder until save; the server assigns real ones.
        added.push({ id: -Date.now() - added.length, imageUrl, isEnabled: true, displayOrder: 0, focusX: 50, focusY: 35 });
      }
      setDraft(current => (current ? { ...current, slides: [...current.slides, ...added] } : current));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      setDraft(await api.saveHomeHero(draft));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const textField = (key: keyof HomeHero, label: Parameters<typeof t>[0], placeholder: string) => (
    <label>{t(label)}
      <input
        value={draft[key] as string}
        placeholder={placeholder}
        onChange={e => edit({ [key]: e.target.value } as Partial<HomeHero>)}
      />
    </label>
  );

  return (
    <section className="admin-row hero-editor">
      <div className="hero-editor-body">
        <h2>{t('welcomePhoto')}</h2>
        <p className="size-chart-note">{t('welcomePhotoIntro')}</p>
        {error && <p className="form-error">{error}</p>}

        <h3>{t('heroPhotos')}</h3>
        <p className="size-chart-note">{t('heroPhotoTips')}</p>
        <p className="size-chart-note">{t('heroFocusTip')}</p>
        {draft.slides.length === 0 && <p className="size-chart-note">{t('noHeroPhotos')}</p>}

        <ol className="hero-editor-slides">
          {draft.slides.map((slide, index) => (
            <li key={slide.id} className={slide.isEnabled ? '' : 'is-hidden'}>
              {/* The whole photo, uncropped. A click marks what must stay visible. */}
              <div className="hero-focus">
                <img src={slide.imageUrl} alt="" onClick={event => setFocus(index, event)} />
                <span className="hero-focus-dot" style={{ left: `${slide.focusX}%`, top: `${slide.focusY}%` }} />
              </div>
              {/* The same crop, focus point and shade as the home page banner, at the
                  shapes it really has: ~2.3:1 on a computer, ~0.64:1 on a phone. */}
              <div className="hero-preview">
                <figure>
                  <div className="hero-preview-frame hero-preview-computer" style={{ backgroundImage: `url("${slide.imageUrl}")`, backgroundPosition: `${slide.focusX}% ${slide.focusY}%` }} />
                  <figcaption>{t('previewComputer')}</figcaption>
                </figure>
                <figure>
                  <div className="hero-preview-frame hero-preview-phone" style={{ backgroundImage: `url("${slide.imageUrl}")`, backgroundPosition: `${slide.focusX}% ${slide.focusY}%` }} />
                  <figcaption>{t('previewPhone')}</figcaption>
                </figure>
              </div>
              <PhotoSize url={slide.imageUrl} minWidth={1920} />
              <span className="hero-editor-number">{index + 1}</span>
              <div className="hero-editor-slide-actions">
                <button
                  type="button"
                  className={slide.isEnabled ? 'status status-active' : 'status status-inactive'}
                  onClick={() => setSlides(draft.slides.map((s, i) => (i === index ? { ...s, isEnabled: !s.isEnabled } : s)))}
                >
                  {slide.isEnabled ? t('shown') : t('hidden')}
                </button>
                <button type="button" className="icon-btn" title={t('moveUp')} aria-label={t('moveUp')}
                  disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="icon-btn" title={t('moveDown')} aria-label={t('moveDown')}
                  disabled={index === draft.slides.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="icon-btn" title={t('remove')} aria-label={t('remove')}
                  onClick={() => setSlides(draft.slides.filter((_, i) => i !== index))}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="hero-editor-add">
          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            multiple
            hidden
            onChange={e => addPhotos(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-light"
            disabled={uploading || draft.slides.length >= MAX_SLIDES}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus size={18} />
            {uploading ? '...' : t('addPhoto')}
          </button>
          <label className="hero-editor-seconds">{t('slideSeconds')}
            <input
              type="number"
              min={2}
              max={30}
              value={draft.slideIntervalSeconds}
              onChange={e => edit({ slideIntervalSeconds: Number(e.target.value) })}
            />
          </label>
        </div>

        <h3>{t('heroTexts')}</h3>
        <p className="size-chart-note">{t('heroTextsHint')}</p>
        <div className="hero-editor-texts">
          {textField('eyebrowEn', 'smallLineEn', 'Spring edit 2026')}
          {textField('eyebrowKa', 'smallLineKa', 'გაზაფხულის კოლექცია 2026')}
          {textField('eyebrowRu', 'smallLineRu', 'Весенняя коллекция 2026')}
          {textField('titleEn', 'bigTitleEn', 'SOFIO')}
          {textField('titleKa', 'bigTitleKa', 'SOFIO')}
          {textField('titleRu', 'bigTitleRu', 'SOFIO')}
        </div>

        <button className="btn btn-dark" onClick={save} disabled={saving || uploading}>
          {saving ? '...' : saved ? t('saved') : t('save')}
        </button>
      </div>
    </section>
  );
}
