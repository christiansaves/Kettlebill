// Pays, provinces et devises proposés dans Fiscalité et Réglages (codes ISO ; noms via Intl côté serveur).

export const COUNTRY_CODES = [
  "CA", "US", "MX", "FR", "BE", "CH", "LU", "MC", "GB", "IE", "DE", "AT", "NL", "ES", "PT", "IT", "PL", "RO",
  "SE", "NO", "DK", "FI", "GR", "TR", "MA", "DZ", "TN", "SN", "CI", "CM", "CD", "NG", "ZA", "EG", "AE", "IL",
  "IN", "CN", "JP", "KR", "VN", "PH", "AU", "NZ", "BR", "AR", "CL", "CO", "PE", "HT",
] as const;

export const CA_PROVINCES = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU"] as const;

export const CURRENCIES = [
  "CAD", "USD", "EUR", "GBP", "CHF", "MXN", "BRL", "MAD", "XOF", "XAF", "HTG", "JPY", "CNY", "INR", "AUD", "NZD",
  "SEK", "NOK", "DKK", "PLN", "RON", "TRY", "DZD", "TND", "NGN", "ZAR", "EGP", "AED", "ILS", "KRW", "VND", "PHP",
  "ARS", "CLP", "COP", "PEN",
] as const;

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
