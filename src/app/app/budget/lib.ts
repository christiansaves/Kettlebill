// Utilitaires du module budget (aussi utilisés par les rapports et le tableau de bord).
import "server-only";
import type { AppContext } from "@/lib/session";
import type { Transaction } from "@/lib/types";

export type TxRow = Pick<Transaction, "id" | "kind" | "amount_cents" | "currency" | "category" | "label" | "occurred_on" | "tax_deductible">;

export const TX_COLUMNS = "id, kind, amount_cents, currency, category, label, occurred_on, tax_deductible";

const PAGE = 1000;

/**
 * Transactions de l'espace courant entre start (inclus) et end (exclu), plus récentes d'abord.
 * Lit par pages de 1000 (limite par défaut de PostgREST).
 */
export async function fetchTransactions(ctx: AppContext, start: string, end: string): Promise<TxRow[]> {
  const out: TxRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await ctx.supabase
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("space_id", ctx.space.id)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as TxRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Montant en cents (bigint renvoyé parfois sous forme de chaîne). */
export function cents(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function sumBy(rows: TxRow[], kind: "income" | "expense") {
  return rows.reduce((s, r) => (r.kind === kind ? s + cents(r.amount_cents) : s), 0);
}

/** Dépenses par catégorie. */
export function expensesByCategory(rows: TxRow[]) {
  const m = new Map<string, number>();
  for (const r of rows) if (r.kind === "expense") m.set(r.category, (m.get(r.category) ?? 0) + cents(r.amount_cents));
  return m;
}

/** Décale un mois AAAA-MM de delta mois. */
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function isIsoDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
