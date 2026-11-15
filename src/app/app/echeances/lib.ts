// Constantes et utilitaires du module Échéances (aussi utilisés par Abonnements et la tâche de rappels).
import { z } from "zod";
import { limitsFor } from "@/lib/plans";
import { spaceOwnerPlan, type AppContext } from "@/lib/session";
import { daysUntil } from "@/lib/format";
import type { DeadlineKind, Recurrence } from "@/lib/types";
import type { T } from "@/lib/i18n/shared";

export const KINDS = ["bill", "renewal", "document", "tax", "appointment", "other"] as const satisfies readonly DeadlineKind[];
export const RECURRENCES = ["none", "monthly", "quarterly", "yearly"] as const satisfies readonly Recurrence[];
export const REMIND_DAYS = [0, 1, 3, 7, 14, 30] as const;

export const uuid = z.uuid();

export function isKind(v: unknown): v is DeadlineKind {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v);
}

/** Validation d'une date « jour » AAAA-MM-JJ réelle (refuse le 31 février). */
export function isIsoDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Limite d'échéances actives de l'espace courant (forfait du propriétaire de l'espace). */
export async function deadlineLimit(ctx: AppContext): Promise<number> {
  return limitsFor(await spaceOwnerPlan(ctx)).deadlines;
}

/** Nombre d'échéances actives (non faites) de l'espace courant. */
export async function countActiveDeadlines(ctx: AppContext): Promise<number> {
  const { count } = await ctx.supabase
    .from("deadlines")
    .select("id", { count: "exact", head: true })
    .eq("space_id", ctx.space.id)
    .eq("done", false);
  return count ?? 0;
}

/** Libellé relatif (« Aujourd'hui », « Dans 3 jours », « En retard de 2 j »). tc = textes communs. */
export function relativeLabel(dueOn: string, tc: T, today?: string) {
  const n = daysUntil(dueOn, today);
  if (n === 0) return tc("date.today");
  if (n === 1) return tc("date.tomorrow");
  if (n > 1) return tc("date.inDays", { n });
  return tc("date.overdue", { n: -n });
}

export function remindLabel(days: number, t: T) {
  if (days === 0) return t("remind.0");
  if (days === 1) return t("remind.1");
  return t("remind.n", { n: days });
}
