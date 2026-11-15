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
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Shqip" },
  { code: "am", name: "አማርኛ" },
  { code: "hy", name: "Հայերեն" },
  { code: "az", name: "Azərbaycanca" },
  { code: "eu", name: "Euskara" },
  { code: "be", name: "Беларуская" },
  { code: "bs", name: "Bosanski" },
  { code: "bg", name: "Български" },
  { code: "my", name: "မြန်မာ" },
  { code: "ca", name: "Català" },
  { code: "hr", name: "Hrvatski" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "et", name: "Eesti" },
  { code: "fi", name: "Suomi" },
  { code: "gl", name: "Galego" },
  { code: "ka", name: "ქართული" },
  { code: "el", name: "Ελληνικά" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "ha", name: "Hausa" },
  { code: "hu", name: "Magyar" },
  { code: "is", name: "Íslenska" },
  { code: "ig", name: "Igbo" },
  { code: "ga", name: "Gaeilge" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "kk", name: "Қазақша" },
  { code: "km", name: "ខ្មែរ" },
  { code: "rw", name: "Kinyarwanda" },
  { code: "ky", name: "Кыргызча" },
  { code: "lo", name: "ລາວ" },
  { code: "lv", name: "Latviešu" },
  { code: "ln", name: "Lingála" },
  { code: "lt", name: "Lietuvių" },
  { code: "mk", name: "Македонски" },
  { code: "mg", name: "Malagasy" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "ml", name: "മലയാളം" },
  { code: "mt", name: "Malti" },
  { code: "mr", name: "मराठी" },
  { code: "mn", name: "Монгол" },
  { code: "ne", name: "नेपाली" },
  { code: "nb", name: "Norsk" },
  { code: "ps", name: "پښتو", rtl: true },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "sr", name: "Српски" },
  { code: "si", name: "සිංහල" },
  { code: "sk", name: "Slovenčina" },
  { code: "sl", name: "Slovenščina" },
  { code: "so", name: "Soomaali" },
  { code: "sv", name: "Svenska" },
  { code: "tg", name: "Тоҷикӣ" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "ti", name: "ትግርኛ" },
  { code: "uz", name: "Oʻzbekcha" },
  { code: "cy", name: "Cymraeg" },
  { code: "wo", name: "Wolof" },
  { code: "xh", name: "isiXhosa" },
  { code: "yo", name: "Yorùbá" },
  { code: "zu", name: "isiZulu" },
  { code: "iu", name: "ᐃᓄᒃᑎᑐᑦ" },
  { code: "cr", name: "ᓀᐦᐃᔭᐍᐏᐣ" },
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
