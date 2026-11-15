// Utilitaires du module Abonnements.
import { addPeriod, todayIso } from "@/lib/format";
import type { Recurring } from "@/lib/types";

export const PERIODS = ["weekly", "monthly", "yearly"] as const satisfies readonly Recurring["period"][];

/** Coût mensuel équivalent, en cents (hebdo ×52/12, annuel /12). */
export function monthlyCents(r: Pick<Recurring, "amount_cents" | "period">) {
  if (r.period === "weekly") return (r.amount_cents * 52) / 12;
  if (r.period === "yearly") return r.amount_cents / 12;
  return r.amount_cents;
}

/** Prochaine date de paiement à partir d'aujourd'hui (avance la période si la date enregistrée est passée, sans l'écrire). */
export function upcomingCharge(r: Pick<Recurring, "next_charge_on" | "period">, today = todayIso()): string | null {
  let d = r.next_charge_on;
  if (!d) return null;
  for (let i = 0; i < 1000 && d < today; i++) d = addPeriod(d, r.period);
  return d;
}
