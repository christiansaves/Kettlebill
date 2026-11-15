// Utilitaires des rapports (aussi utilisés par le tableau de bord).
import "server-only";
import type { AppContext } from "@/lib/session";
import type { Recurring } from "@/lib/types";
import { cents } from "../budget/lib";

/** Équivalent mensuel d'un paiement récurrent, en cents. */
export function monthlyEquivalent(amountCents: number, period: Recurring["period"]) {
  if (period === "weekly") return Math.round((amountCents * 52) / 12);
  if (period === "yearly") return Math.round(amountCents / 12);
  return amountCents;
}

/** Total mensuel des paiements récurrents actifs de l'espace courant. */
export async function activeRecurringMonthly(ctx: AppContext) {
  const { data } = await ctx.supabase
    .from("recurring")
    .select("amount_cents, period")
    .eq("space_id", ctx.space.id)
    .eq("active", true);
  const rows = (data ?? []) as Pick<Recurring, "amount_cents" | "period">[];
  return {
    count: rows.length,
    monthly: rows.reduce((s, r) => s + monthlyEquivalent(cents(r.amount_cents), r.period), 0),
  };
}

/** Échelle « ronde » pour un axe : pas de 1, 2, 2,5 ou 5 × 10^k, environ `ticks` graduations. */
export function niceScale(max: number, ticks = 4) {
  if (!(max > 0)) return { max: ticks, step: 1, values: Array.from({ length: ticks + 1 }, (_, i) => i) };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * mag;
  const top = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) values.push(v);
  return { max: top, step, values };
}

export function parseYear(v: unknown) {
  const now = new Date().getUTCFullYear();
  if (typeof v !== "string" || !/^\d{4}$/.test(v)) return now;
  const y = Number(v);
  return y >= 1900 && y <= 2200 ? y : now;
}
