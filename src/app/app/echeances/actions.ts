"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { addPeriod, parseMoneyToCents } from "@/lib/format";
import { isUnlimited } from "@/lib/plans";
import type { ActionResult, Deadline } from "@/lib/types";
import { KINDS, RECURRENCES, countActiveDeadlines, deadlineLimit, isIsoDate, uuid } from "./lib";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(KINDS),
  due_on: z.string().refine(isIsoDate),
  recurrence: z.enum(RECURRENCES),
  // L'interface propose REMIND_DAYS ; la base accepte 0 à 90 (valeurs existantes conservées).
  remind_days: z.coerce.number().int().min(0).max(90),
  notes: z.string().trim().max(2000),
});

type Parsed = { ok: true; data: z.infer<typeof schema> & { amount_cents: number | null } } | { ok: false; error: string };

async function parse(formData: FormData): Promise<Parsed> {
  const t = await getT("deadlines");
  const tc = await getT("common");
  const r = schema.safeParse({
    title: formData.get("title") ?? "",
    kind: formData.get("kind") ?? "",
    due_on: formData.get("due_on") ?? "",
    recurrence: formData.get("recurrence") ?? "none",
    remind_days: formData.get("remind_days") ?? 7,
    notes: formData.get("notes") ?? "",
  });
  if (!r.success) {
    const field = r.error.issues[0]?.path[0];
    if (field === "title") return { ok: false, error: t("error.title") };
    if (field === "due_on") return { ok: false, error: tc("error.date") };
    return { ok: false, error: tc("error.generic") };
  }
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const amount_cents = rawAmount ? parseMoneyToCents(rawAmount) : null;
  if (rawAmount && amount_cents == null) return { ok: false, error: tc("error.amount") };
  return { ok: true, data: { ...r.data, amount_cents } };
}

function revalidate() {
  // Le layout /app affiche une pastille « échéances proches » : on rafraîchit tout l'espace.
  revalidatePath("/app", "layout");
}

export async function addDeadline(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("deadlines");
  const tc = await getT("common");
  const p = await parse(formData);
  if (!p.ok) return p;

  const limit = await deadlineLimit(ctx);
  if (!isUnlimited(limit) && (await countActiveDeadlines(ctx)) >= limit) {
    return { ok: false, error: t("error.limit", { limit }) };
  }

  const { error } = await ctx.supabase.from("deadlines").insert({ ...p.data, space_id: ctx.space.id, created_by: ctx.user.id });
  if (error) {
    console.error("[deadlines] add", error);
    return { ok: false, error: tc("error.generic") };
  }
  revalidate();
  return { ok: true, message: t("add.success") };
}

export async function updateDeadline(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("deadlines");
  const tc = await getT("common");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: t("error.notFound") };
  const p = await parse(formData);
  if (!p.ok) return p;

  const { data, error } = await ctx.supabase
    .from("deadlines")
    .update(p.data)
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .select("id");
  if (error) {
    console.error("[deadlines] update", error);
    return { ok: false, error: tc("error.generic") };
  }
  if (!data?.length) return { ok: false, error: t("error.notFound") };
  revalidate();
  return { ok: true, message: t("edit.success") };
}

/** Marque comme faite ; pour une échéance récurrente, crée l'occurrence suivante (hors limite du forfait). */
export async function markDone(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;

  // Le filtre done=false rend l'action idempotente (double clic = une seule occurrence suivante).
  const { data: rows, error } = await ctx.supabase
    .from("deadlines")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .eq("done", false)
    .select("*");
  if (error) {
    console.error("[deadlines] done", error);
    return;
  }
  const d = (rows as Deadline[] | null)?.[0];
  if (d && d.recurrence !== "none") {
    const { error: e2 } = await ctx.supabase.from("deadlines").insert({
      space_id: ctx.space.id,
      title: d.title,
      kind: d.kind,
      due_on: addPeriod(d.due_on, d.recurrence),
      amount_cents: d.amount_cents,
      recurrence: d.recurrence,
      remind_days: d.remind_days,
      notes: d.notes,
      created_by: ctx.user.id,
    });
    if (e2) console.error("[deadlines] next occurrence", e2);
  }
  revalidate();
}

/** Annule « faite » ; retire l'occurrence suivante créée automatiquement si elle est encore active. */
export async function undoDone(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;

  const { data: d } = await ctx.supabase
    .from("deadlines")
    .select("*")
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .eq("done", true)
    .maybeSingle<Deadline>();
  if (!d) return;

  let removedNext = false;
  if (d.recurrence !== "none") {
    const { data: next } = await ctx.supabase
      .from("deadlines")
      .select("id")
      .eq("space_id", ctx.space.id)
      .eq("done", false)
      .eq("title", d.title)
      .eq("recurrence", d.recurrence)
      .eq("due_on", addPeriod(d.due_on, d.recurrence))
      .order("created_at", { ascending: false })
      .limit(1);
    if (next?.[0]) {
      const { error } = await ctx.supabase.from("deadlines").delete().eq("id", next[0].id).eq("space_id", ctx.space.id);
      removedNext = !error;
    }
  }

  if (!removedNext) {
    const limit = await deadlineLimit(ctx);
    if (!isUnlimited(limit) && (await countActiveDeadlines(ctx)) >= limit) return;
  }

  await ctx.supabase
    .from("deadlines")
    .update({ done: false, done_at: null })
    .eq("id", d.id)
    .eq("space_id", ctx.space.id);
  revalidate();
}

export async function deleteDeadline(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("deadlines").delete().eq("id", id.data).eq("space_id", ctx.space.id);
  if (error) console.error("[deadlines] delete", error);
  revalidate();
}
