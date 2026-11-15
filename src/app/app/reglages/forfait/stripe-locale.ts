// Langue de l'interface Kettlebill → langue des pages Stripe (Checkout et portail client).
// Listes tirées des types du SDK Stripe (API 2026-10-28) ; repli sur « auto » (langue du navigateur).

const COMMON = [
  "bg", "cs", "da", "de", "el", "en", "en-GB", "es", "es-419", "et", "fi", "fil", "fr", "fr-CA", "hr", "hu", "id", "it",
  "ja", "ko", "lt", "lv", "ms", "mt", "nb", "nl", "pl", "pt", "pt-BR", "ro", "ru", "sk", "sl", "sv", "th", "tr", "vi",
  "zh", "zh-HK", "zh-TW",
];
const SUPPORTED = {
  checkout: new Set([...COMMON, "hi-IN"]),
  portal: new Set([...COMMON, "en-AU", "en-CA", "en-IE", "en-IN", "en-NZ", "en-SG"]),
};

/** Codes de l'application qui n'ont pas le même nom chez Stripe. */
const ALIASES: Record<string, string> = { tl: "fil", hi: "hi-IN" };

export function stripeLocale(locale: string, country: string | undefined, target: "checkout" | "portal" = "checkout"): string {
  const supported = SUPPORTED[target];
  const base = (ALIASES[locale] ?? locale).trim();
  const regional = country ? `${base.split("-")[0]}-${country.toUpperCase()}` : null;
  if (regional && supported.has(regional)) return regional; // ex. fr-CA, en-CA, pt-BR
  if (supported.has(base)) return base;
  const short = base.split("-")[0];
  return supported.has(short) ? short : "auto";
}
