// Format de l'estimation fiscale produite par l'IA : schéma JSON strict + lecture défensive des lignes enregistrées.

export type Confidence = "low" | "medium" | "high";

export interface FiscalResult {
  currency: string;
  summary: string;
  income_tax: { federal_or_national: number | null; regional: number | null; total: number | null; notes: string };
  social_contributions: { total: number | null; details: { name: string; amount: number | null }[] };
  sales_tax: { applies: boolean; explanation: string; registration_threshold: number | null; amount_to_remit: number | null };
  total_estimated: number | null;
  effective_rate_percent: number | null;
  credits: { name: string; description: string; estimated_value: number | null; how_to_claim: string }[];
  deductions_to_consider: { name: string; description: string }[];
  key_deadlines: { label: string; date: string }[];
  assumptions: string[];
  warnings: string[];
  confidence: Confidence;
}

/** Ce que l'utilisateur a saisi (montants en cents). */
export interface FiscalInput {
  country: string;
  region: string;
  tax_year: number;
  household: string;
  dependents: number;
  employment_cents: number;
  self_employment_cents: number;
  other_income_cents: number;
  deductible_cents: number;
  retirement_cents: number;
  sales_cents: number;
  notes: string;
  currency: string;
}

const num = { anyOf: [{ type: "number" }, { type: "null" }] };
const str = { type: "string" };

function obj(properties: Record<string, unknown>) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

export const FISCAL_SCHEMA: Record<string, unknown> = obj({
  currency: { type: "string", description: "ISO 4217 code of the local currency, e.g. CAD" },
  summary: str,
  income_tax: obj({ federal_or_national: num, regional: num, total: num, notes: str }),
  social_contributions: obj({ total: num, details: { type: "array", items: obj({ name: str, amount: num }) } }),
  sales_tax: obj({ applies: { type: "boolean" }, explanation: str, registration_threshold: num, amount_to_remit: num }),
  total_estimated: num,
  effective_rate_percent: num,
  credits: { type: "array", items: obj({ name: str, description: str, estimated_value: num, how_to_claim: str }) },
  deductions_to_consider: { type: "array", items: obj({ name: str, description: str }) },
  key_deadlines: {
    type: "array",
    items: obj({ label: str, date: { type: "string", description: "Exact date in YYYY-MM-DD format" } }),
  },
  assumptions: { type: "array", items: str },
  warnings: { type: "array", items: str },
  confidence: { type: "string", enum: ["low", "medium", "high"] },
});

const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const s = (v: unknown, max = 4000): string => (typeof v === "string" ? v.slice(0, max) : "");
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 40) : []);

/** Relit un résultat enregistré (jsonb) sans faire confiance à sa forme. */
export function readResult(raw: unknown, fallbackCurrency: string): FiscalResult {
  const r = rec(raw);
  const it = rec(r.income_tax);
  const sc = rec(r.social_contributions);
  const st = rec(r.sales_tax);
  const cur = s(r.currency).toUpperCase();
  const conf = r.confidence === "high" || r.confidence === "medium" ? r.confidence : "low";
  return {
    currency: /^[A-Z]{3}$/.test(cur) ? cur : fallbackCurrency,
    summary: s(r.summary),
    income_tax: { federal_or_national: n(it.federal_or_national), regional: n(it.regional), total: n(it.total), notes: s(it.notes) },
    social_contributions: {
      total: n(sc.total),
      details: arr(sc.details).map((d) => ({ name: s(rec(d).name, 200), amount: n(rec(d).amount) })),
    },
    sales_tax: {
      applies: st.applies === true,
      explanation: s(st.explanation),
      registration_threshold: n(st.registration_threshold),
      amount_to_remit: n(st.amount_to_remit),
    },
    total_estimated: n(r.total_estimated),
    effective_rate_percent: n(r.effective_rate_percent),
    credits: arr(r.credits).map((c) => {
      const x = rec(c);
      return { name: s(x.name, 200), description: s(x.description), estimated_value: n(x.estimated_value), how_to_claim: s(x.how_to_claim) };
    }),
    deductions_to_consider: arr(r.deductions_to_consider).map((d) => ({ name: s(rec(d).name, 200), description: s(rec(d).description) })),
    key_deadlines: arr(r.key_deadlines).map((d) => ({ label: s(rec(d).label, 200), date: s(rec(d).date, 10) })),
    assumptions: arr(r.assumptions).map((a) => s(a)).filter(Boolean),
    warnings: arr(r.warnings).map((a) => s(a)).filter(Boolean),
    confidence: conf,
  };
}

export function readInput(raw: unknown): FiscalInput {
  const r = rec(raw);
  const c = (k: string) => Math.max(0, Math.round(n(r[k]) ?? 0));
  return {
    country: s(r.country, 60),
    region: s(r.region, 60),
    tax_year: n(r.tax_year) ?? 0,
    household: s(r.household, 40),
    dependents: c("dependents"),
    employment_cents: c("employment_cents"),
    self_employment_cents: c("self_employment_cents"),
    other_income_cents: c("other_income_cents"),
    deductible_cents: c("deductible_cents"),
    retirement_cents: c("retirement_cents"),
    sales_cents: c("sales_cents"),
    notes: s(r.notes, 2000),
    currency: s(r.currency, 3),
  };
}

/** Date AAAA-MM-JJ réelle ? */
export function isIsoDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Montant en unités (ex. 1234.5) → texte d'affichage, « — » si inconnu. */
export function moneyUnits(v: number | null, currency: string, locale: string, format: (cents: number, c: string, l: string) => string) {
  return v == null ? "—" : format(Math.round(v * 100), currency, locale);
}

export const HOUSEHOLDS = ["single", "couple", "singleParent", "separated", "widowed"] as const;

/** Années proposées : l'année en cours et les deux précédentes. */
export function taxYears(now = new Date()) {
  const y = now.getUTCFullYear();
  return [y, y - 1, y - 2];
}
