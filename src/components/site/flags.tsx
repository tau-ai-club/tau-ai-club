import type { Locale } from "@/i18n/routing";

/*
 * Flag artwork. The colours below are the flags themselves (content, not brand), so they are
 * SVG attributes here and nowhere else: an allowed exception to the no-raw-hex rule.
 * 20x14, decorative (the language name is always next to it), rounded corners via clipPath.
 */
function Flag({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true" focusable="false" className="shrink-0">
      <clipPath id={id}>
        <rect width="20" height="14" rx="2" />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </svg>
  );
}

const STRIPE = 14 / 13;

const FLAGS: Record<Locale, React.ReactNode> = {
  he: (
    <Flag id="flag-he">
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect y="1.6" width="20" height="2.2" fill="#0038B8" />
      <rect y="10.2" width="20" height="2.2" fill="#0038B8" />
      <path d="M10 4.6 12.6 9.2H7.4Z M10 9.4 7.4 4.8H12.6Z" fill="none" stroke="#0038B8" strokeWidth="0.55" />
    </Flag>
  ),
  en: (
    <Flag id="flag-en">
      <rect width="20" height="14" fill="#FFFFFF" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * STRIPE} width="20" height={STRIPE} fill="#B22234" />
      ))}
      <rect width="9" height={7 * STRIPE} fill="#3C3B6E" />
      {[1.6, 4.5, 7.4, 3, 6, 1.6, 4.5, 7.4].map((x, i) => (
        <circle key={i} cx={x} cy={i < 3 ? 1.6 : i < 5 ? 3.7 : 5.8} r="0.5" fill="#FFFFFF" />
      ))}
    </Flag>
  ),
  de: (
    <Flag id="flag-de">
      <rect width="20" height="14" fill="#FFCE00" />
      <rect width="20" height="4.67" fill="#000000" />
      <rect y="4.67" width="20" height="4.67" fill="#DD0000" />
    </Flag>
  ),
  fr: (
    <Flag id="flag-fr">
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="6.67" height="14" fill="#002395" />
      <rect x="13.33" width="6.67" height="14" fill="#ED2939" />
    </Flag>
  ),
};

export function LocaleFlag({ locale }: { locale: Locale }) {
  return FLAGS[locale];
}
