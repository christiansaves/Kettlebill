"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatDate, parseMoneyToCents } from "@/lib/format";
import { isUnlimited } from "@/lib/plans";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { ActionResult, Recurring } from "@/lib/types";
import { countActiveDeadlines, deadlineLimit, isIsoDate, uuid } from "../echeances/lib";
import { PERIODS, upcomingCharge } from "./lib";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  period: z.enum(PERIODS),
  next_charge_on: z.union([z.literal(""), z.string().refine(isIsoDate)]),
  category: z.enum(EXPENSE_CATEGORIES),
  notes: z.string().trim().max(2000),
});

async function parse(formData: FormData) {
  const t = await getT("recurring");
  const tc = await getT("common");
  const r = schema.safeParse({
    name: formData.get("name") ?? "",
    period: formData.get("period") ?? "monthly",
    next_charge_on: formData.get("next_charge_on") ?? "",
    category: formData.get("category") ?? "subscriptions",
    notes: formData.get("notes") ?? "",
  });
  if (!r.success) {
    const field = r.error.issues[0]?.path[0];
    if (field === "name") return { ok: false as const, error: t("error.name") };
    if (field === "next_charge_on") return { ok: false as const, error: tc("error.date") };
    return { ok: false as const, error: tc("error.generic") };
  }
  const amount_cents = parseMoneyToCents(formData.get("amount"));
  if (amount_cents == null) return { ok: false as const, error: tc("error.amount") };
  return {
    ok: true as const,
    data: { ...r.data, next_charge_on: r.data.next_charge_on || null, amount_cents },
  };
}

function revalidate() {
  revalidatePath("/app/abonnements");
  revalidatePath("/app");
}

export async function addRecurring(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("recurring");
  const tc = await getT("common");
  const p = await parse(formData);
  if (!p.ok) return p;
  const { error } = await ctx.supabase.from("recurring").insert({ ...p.data, space_id: ctx.space.id });
  if (error) {
    console.error("[recurring] add", error);
    return { ok: false, error: tc("error.generic") };
  }
  revalidate();
  return { ok: true, message: t("add.success") };
}

export async function updateRecurring(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("recurring");
  const tc = await getT("common");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: t("error.notFound") };
  const p = await parse(formData);
  if (!p.ok) return p;
  const { data, error } = await ctx.supabase
    .from("recurring")
    .update(p.data)
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .select("id");
  if (error) {
    console.error("[recurring] update", error);
    return { ok: false, error: tc("error.generic") };
  }
  if (!data?.length) return { ok: false, error: t("error.notFound") };
  revalidate();
  return { ok: true, message: t("edit.success") };
}

/** Met en pause ou reprend (le formulaire envoie l'état voulu). */
export async function setRecurringActive(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const active = formData.get("active") === "true";
  const { error } = await ctx.supabase.from("recurring").update({ active }).eq("id", id.data).eq("space_id", ctx.space.id);
  if (error) console.error("[recurring] toggle", error);
  revalidate();
}

export async function deleteRecurring(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("recurring").delete().eq("id", id.data).eq("space_id", ctx.space.id);
  if (error) console.error("[recurring] delete", error);
  revalidate();
}

/** Crée une échéance « renouvellement » pour le prochain paiement (respecte la limite d'échéances). */
export async function createDeadlineFromRecurring(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("recurring");
  const tc = await getT("common");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: t("error.notFound") };

  const { data: r } = await ctx.supabase
    .from("recurring")
    .select("*")
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .maybeSingle<Recurring>();
  if (!r) return { ok: false, error: t("error.notFound") };

  const due = upcomingCharge(r);
  if (!due) return { ok: false, error: t("toDeadline.noDate") };
  const title = t("toDeadline.title", { name: r.name }).slice(0, 200);

  const { data: existing } = await ctx.supabase
    .from("deadlines")
    .select("id")
    .eq("space_id", ctx.space.id)
    .eq("done", false)
    .eq("title", title)
    .eq("due_on", due)
    .limit(1);
  if (existing?.length) return { ok: false, error: t("toDeadline.exists") };

  const limit = await deadlineLimit(ctx);
  if (!isUnlimited(limit) && (await countActiveDeadlines(ctx)) >= limit) {
    return { ok: false, error: t("toDeadline.limit", { limit }) };
  }

  const { error } = await ctx.supabase.from("deadlines").insert({
    space_id: ctx.space.id,
    title,
    kind: "renewal",
    due_on: due,
    amount_cents: r.amount_cents,
    recurrence: r.period === "monthly" || r.period === "yearly" ? r.period : "none",
    remind_days: r.period === "yearly" ? 14 : 3,
    notes: r.notes,
    created_by: ctx.user.id,
  });
  if (error) {
    console.error("[recurring] to deadline", error);
    return { ok: false, error: tc("error.generic") };
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: t("toDeadline.success", { date: formatDate(due, ctx.locale) }) };
}
