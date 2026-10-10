import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { AppSetting } from '../types';

/** Lucide ships no brand marks, so these two are drawn inline. */
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

function ViberIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.3 2c1.9.04 3.9.35 5.3 1.36 1.3.93 2 2.6 2.3 4.5.3 1.9.3 4.1-.1 6-.4 1.9-1.2 3.4-2.6 4.2-.3.2-.7.4-1.1.5v2.8c0 .5-.6.8-1 .5l-2.3-2.1c-.4 0-.8.01-1.1.01-1.9 0-3.9-.3-5.3-1.3-1.3-1-2-2.6-2.3-4.5-.3-1.9-.3-4.1.1-6C4.6 6 5.4 4.5 6.8 3.7 8.2 2.3 10.4 2 12.3 2Zm0 1.6c-1.7 0-3.4.3-4.4 1-.9.6-1.5 1.8-1.8 3.4-.3 1.7-.3 3.7 0 5.4.3 1.6.9 2.8 1.8 3.4 1 .7 2.7 1 4.4 1 .4 0 .9 0 1.4-.03.2-.01.5.07.6.2l1.4 1.3v-1.9c0-.4.2-.7.6-.8.4-.1.7-.2 1-.4.9-.6 1.5-1.8 1.8-3.4.3-1.7.3-3.7 0-5.4-.3-1.6-.9-2.8-1.8-3.4-1-.7-2.7-1-4.4-1Zm-2.1 3.1c.3-.1.6 0 .8.3l1 1.5c.2.3.1.7-.2.9l-.5.4c-.1.1-.2.3-.1.4.3.7 1 1.4 1.7 1.7.2.1.3 0 .4-.1l.4-.5c.2-.3.6-.3.9-.2l1.5 1c.3.2.4.5.3.8-.3.9-1.2 1.5-2.1 1.3-2.4-.5-4.5-2.6-5-5-.2-.9.3-1.8 1.2-2.1Zm2.3-.6a3.9 3.9 0 0 1 3.5 3.5c.03.3-.2.6-.5.6-.3.03-.6-.2-.6-.5a2.8 2.8 0 0 0-2.5-2.5c-.3-.03-.5-.3-.5-.6 0-.3.3-.5.6-.5Zm.1-1.9a5.8 5.8 0 0 1 5.3 5.3c.03.3-.2.6-.5.6-.3.02-.6-.2-.6-.5a4.7 4.7 0 0 0-4.3-4.3c-.3-.03-.5-.3-.5-.6 0-.3.3-.5.6-.5Z" />
    </svg>
  );
}

/**
 * Renders whatever contact details the shop has filled in and nothing else, so a
 * blank setting never produces an empty row or a link to nowhere.
 */
export function ShopContact({ settings }: { settings: AppSetting[] }) {
  const { t } = useI18n();
  const value = (key: string) => settings.find(item => item.key === key)?.value?.trim() ?? '';

  const phone = value('shop_phone');
  const email = value('shop_email');
  const address = value('shop_address');
  const mapUrl = value('shop_map_url');
  const instagram = value('shop_instagram');
  // Both default to the main phone number, which is the usual case for a small shop.
  const whatsapp = value('shop_whatsapp') || phone;
  const viber = value('shop_viber') || phone;

  const digits = (input: string) => input.replace(/[^\d+]/g, '');

  if (!phone && !email && !address && !instagram) return null;

  // Instagram may be stored as a handle or a full URL; accept either.
  const instagramHandle = instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');

  return (
    <div className="shop-contact">
      <strong>{t('contactUs')}</strong>

      {phone && (
        <p className="shop-contact-line">
          <Phone size={15} />
          <a href={`tel:${digits(phone)}`}>{phone}</a>
          <span className="shop-contact-apps">
            <a
              href={`https://wa.me/${digits(whatsapp).replace('+', '')}`}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`WhatsApp ${whatsapp}`}
              title="WhatsApp"
              className="contact-app contact-app-whatsapp"
            >
              <WhatsAppIcon />
            </a>
            <a
              href={`viber://chat?number=${encodeURIComponent(digits(viber))}`}
              aria-label={`Viber ${viber}`}
              title="Viber"
              className="contact-app contact-app-viber"
            >
              <ViberIcon />
            </a>
          </span>
        </p>
      )}

      {email && (
        <p className="shop-contact-line">
          <Mail size={15} />
          <a href={`mailto:${email}`}>{email}</a>
        </p>
      )}

      {address && (
        <p className="shop-contact-line">
          <MapPin size={15} />
          {mapUrl
            ? <a href={mapUrl} target="_blank" rel="noreferrer noopener">{address}</a>
            : <span>{address}</span>}
        </p>
      )}

      {instagramHandle && (
        <p className="shop-contact-line">
          <Instagram size={15} />
          <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer noopener">
            @{instagramHandle}
          </a>
        </p>
      )}
    </div>
  );
}
