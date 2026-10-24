import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { HomeHero } from '../types';
import { localizedOverride } from '../utils/format';

/**
 * The welcome banner. No photos: the built-in default from CSS. One photo: shown
 * still. Two or more: a crossfading slideshow with dots.
 */
export function HomeHeroBanner() {
  const [hero, setHero] = useState<HomeHero | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);
  const { t, language } = useI18n();

  useEffect(() => {
    api.homeHero()
      .then(setHero)
      .catch(() => setHero(null))
      .finally(() => setLoaded(true));
  }, []);

  const slides = hero?.slides ?? [];
  const isSlideshow = slides.length > 1;
  const intervalMs = (hero?.slideIntervalSeconds ?? 6) * 1000;

  useEffect(() => {
    if (!isSlideshow) return;
    // Visitors who asked the system for less motion get the dots but no auto-advance.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setCurrent(index => (index + 1) % slides.length), intervalMs);
    return () => window.clearInterval(timer);
    // `current` restarts the timer, so a dot click gets a full interval before moving on.
  }, [isSlideshow, slides.length, intervalMs, current]);

  const eyebrow = localizedOverride(
    { en: hero?.eyebrowEn ?? '', ka: hero?.eyebrowKa ?? '' },
    language,
    t('heroEyebrow'),
  );
  const title = localizedOverride(
    { en: hero?.titleEn ?? '', ka: hero?.titleKa ?? '' },
    language,
    t('heroTitle'),
  );
  // No built-in text: the line under the title appears only once the shop owner writes one.
  const subtitle = localizedOverride({ en: hero?.subtitleEn ?? '', ka: hero?.subtitleKa ?? '' }, language, '');

  return (
    // Until the banner is loaded the default photo stays off, so it does not flash
    // up and then get replaced by the shop's own photo.
    <section className={!loaded || slides.length > 0 ? 'hero hero--custom' : 'hero'}>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={index === current % slides.length ? 'hero__slide is-active' : 'hero__slide'}
          // The chosen focus point stays visible however the screen crops the photo.
          style={{ backgroundImage: `url("${slide.imageUrl}")`, backgroundPosition: `${slide.focusX}% ${slide.focusY}%` }}
          aria-hidden="true"
        />
      ))}

      <div className={loaded ? 'hero__content' : 'hero__content is-loading'}>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className="eyebrow hero__subtitle">{subtitle}</p>}
        <Link className="btn btn-light" to="/products">
          {t('shopNow')}
          <ArrowRight size={18} />
        </Link>
      </div>

      {isSlideshow && (
        <div className="hero__dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === current % slides.length ? 'is-active' : ''}
              aria-label={`${t('showSlide')} ${index + 1}`}
              aria-current={index === current % slides.length}
              onClick={() => setCurrent(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
