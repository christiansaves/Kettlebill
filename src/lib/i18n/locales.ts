// Langues proposées. Le français est la langue source ; l'anglais est traduit à la main ;
// les autres sont traduites par l'IA une seule fois, puis gardées en cache dans la base.

export interface LocaleInfo {
  code: string;
  name: string; // nom dans sa propre langue
  rtl?: boolean;
}

export const SOURCE_LOCALE = "fr";
export const HAND_TRANSLATED = ["fr", "en"] as const;

export const LOCALES: LocaleInfo[] = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "ro", name: "Română" },
  { code: "tr", name: "Türkçe" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "fa", name: "فارسی", rtl: true },
  { code: "he", name: "עברית", rtl: true },
  { code: "hi", name: "हिन्दी" },
  { code: "bn", name: "বাংলা" },
  { code: "ur", name: "اردو", rtl: true },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "tl", name: "Tagalog" },
  { code: "sw", name: "Kiswahili" },
  { code: "ht", name: "Kreyòl ayisyen" },
];

export function isSupported(code: string | undefined | null): code is string {
  return Boolean(code && LOCALES.some((l) => l.code === code));
}

export function isRtl(code: string) {
  return Boolean(LOCALES.find((l) => l.code === code)?.rtl);
}

export function localeName(code: string) {
  return LOCALES.find((l) => l.code === code)?.name ?? code;
}
