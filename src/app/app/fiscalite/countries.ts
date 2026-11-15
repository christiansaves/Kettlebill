// Pays, provinces et devises proposés dans Fiscalité et Réglages (codes ISO ; noms via Intl côté serveur).

// Tous les pays et territoires (ISO 3166-1), triés par nom à l'affichage.
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB",
  "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX",
  "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
  "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
  "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA",
  "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE",
  "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG",
  "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
  "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

export const CA_PROVINCES = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU"] as const;

// Toutes les devises connues du moteur JavaScript (ISO 4217), les plus courantes en tête.
const COMMON_CURRENCIES = ["CAD", "USD", "EUR", "GBP", "CHF", "MXN", "BRL", "MAD", "XOF", "XAF", "HTG", "JPY", "CNY", "INR", "AUD"];
const ALL_CURRENCIES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("currency");
  } catch {
    return [];
  }
})();
export const CURRENCIES: readonly string[] = [...COMMON_CURRENCIES, ...ALL_CURRENCIES.filter((c) => !COMMON_CURRENCIES.includes(c))];

export const OTHER_COUNTRY = "__other";

export interface Option {
  code: string;
  name: string;
}

function displayNames(locale: string, type: "region" | "currency") {
  try {
    return new Intl.DisplayNames([locale, "fr"], { type });
  } catch {
    return null;
  }
}

export function countryName(code: string, locale: string) {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return displayNames(locale, "region")?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Liste triée selon la langue (à calculer côté serveur pour éviter les écarts d'hydratation). */
export function countryOptions(locale: string): Option[] {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}

export function currencyOptions(locale: string): Option[] {
  const dn = displayNames(locale, "currency");
  return CURRENCIES.map((code) => {
    let name: string = code;
    try {
      name = dn?.of(code) ?? code;
    } catch {
      /* code inconnu */
    }
    return { code, name };
  });
}

export function isKnownCountry(code: string) {
  return (COUNTRY_CODES as readonly string[]).includes(code);
}

/** Lit pays et région d'un formulaire (CountryRegionFields). Retourne null si le pays est vide. */
export function readCountryRegion(fd: FormData): { country: string; region: string } | null {
  const raw = String(fd.get("country") ?? "").trim();
  const country =
    raw === OTHER_COUNTRY ? String(fd.get("country_other") ?? "").trim().slice(0, 60) : raw.toUpperCase().slice(0, 2);
  if (!country) return null;
  if (raw !== OTHER_COUNTRY && !isKnownCountry(country)) return null;
  let region = String(fd.get("region") ?? "").trim().slice(0, 60);
  if (country === "CA") region = (CA_PROVINCES as readonly string[]).includes(region) ? region : "QC";
  return { country, region };
}
