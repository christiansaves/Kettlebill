// Formatage selon la langue et la devise de l'utilisateur.

export function intlLocale(locale: string, country?: string) {
  if (locale.includes("-")) return locale;
  return country ? `${locale}-${country}` : locale;
}

export function formatMoney(cents: number | null | undefined, currency: string, locale: string) {
  const v = (cents ?? 0) / 100;
  // Sans région, « fr » affiche « 12,00 $CA » : au Canada on préfère « 12,00 $ ».
  const loc = !locale.includes("-") && currency === "CAD" ? `${locale}-CA` : locale;
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso: string | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "";
  // Les dates « jour » (AAAA-MM-JJ) sont interprétées à midi pour éviter les décalages de fuseau.
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat(locale, opts ?? { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Convertit « 12,50 » ou « 12.50 » en cents. Retourne null si invalide. */
export function parseMoneyToCents(input: FormDataEntryValue | null): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Date du jour au format AAAA-MM-JJ dans le fuseau de l'application (APP_TIMEZONE, par défaut America/Toronto),
 * pour éviter qu'à 20 h au Québec le serveur (en UTC) soit déjà au lendemain.
 */
export function todayIso(timeZone = process.env.APP_TIMEZONE || "America/Toronto") {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function daysUntil(isoDate: string, from = todayIso()) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${isoDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function addPeriod(isoDate: string, recurrence: "monthly" | "quarterly" | "yearly" | "weekly") {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (recurrence === "weekly") {
    const w = new Date(Date.UTC(y, m - 1, d + 7));
    return w.toISOString().slice(0, 10);
  }
  const months = recurrence === "monthly" ? 1 : recurrence === "quarterly" ? 3 : 12;
  // Ramène au dernier jour du mois si nécessaire (31 janvier + 1 mois = 28 ou 29 février).
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function monthBounds(ym?: string) {
  const base = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : todayIso().slice(0, 7);
  const [y, m] = base.split("-").map(Number);
  const start = `${base}-01`;
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { month: base, start, end: next };
}
