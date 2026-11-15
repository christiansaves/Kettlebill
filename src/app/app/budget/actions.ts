"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { parseMoneyToCents } from "@/lib/format";
import { isCategory } from "@/lib/categories";
import type { ActionResult } from "@/lib/types";
import { isIsoDate } from "./lib";

const uuid = z.uuid();

const txSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1).max(40),
  label: z.string().trim().max(200),
  occurred_on: z.string().refine(isIsoDate),
  tax_deductible: z.boolean(),
});

function revalidateAll() {
  revalidatePath("/app/budget");
  revalidatePath("/app/rapports");
  revalidatePath("/app");
}

async function parseTx(formData: FormData): Promise<{ ok: true; value: z.infer<typeof txSchema> & { amount_cents: number } } | { ok: false; error: string }> {
  const t = await getT("budget");
  const tc = await getT("common");
  const amount = parseMoneyToCents(formData.get("amount"));
  if (amount == null) return { ok: false, error: tc("error.amount") };
  if (amount <= 0) return { ok: false, error: t("error.amountPositive") };

  const parsed = txSchema.safeParse({
    kind: formData.get("kind"),
    category: String(formData.get("category") ?? ""),
    label: String(formData.get("label") ?? ""),
    occurred_on: String(formData.get("occurred_on") ?? ""),
    tax_deductible: formData.get("tax_deductible") === "on",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "kind") return { ok: false, error: t("error.kind") };
    if (field === "label") return { ok: false, error: t("error.label") };
    if (field === "occurred_on") return { ok: false, error: tc("error.date") };
    return { ok: false, error: t("error.category") };
  }
  const v = parsed.data;
  if (!isCategory(v.kind, v.category)) return { ok: false, error: t("error.category") };
  // Une dépense déductible n'a de sens que pour une dépense.
  return { ok: true, value: { ...v, tax_deductible: v.kind === "expense" && v.tax_deductible, amount_cents: amount } };
}

export async function createTransaction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("budget");
  const tc = await getT("common");
  const p = await parseTx(formData);
  if (!p.ok) return p;
  const { error } = await ctx.supabase.from("transactions").insert({
    ...p.value,
    space_id: ctx.space.id,
    currency: ctx.currency,
    created_by: ctx.user.id,
  });
  if (error) {
    console.error("[budget] insert", error);
    return { ok: false, error: tc("error.generic") };
  }
  revalidateAll();
  return { ok: true, message: t("msg.added") };
}

export async function updateTransaction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("budget");
  const tc = await getT("common");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: t("error.notFound") };
  const p = await parseTx(formData);
  if (!p.ok) return p;
  const { data, error } = await ctx.supabase
    .from("transactions")
    .update(p.value)
    .eq("id", id.data)
    .eq("space_id", ctx.space.id)
    .select("id");
  if (error) {
    console.error("[budget] update", error);
    return { ok: false, error: tc("error.generic") };
  }
  if (!data?.length) return { ok: false, error: t("error.notFound") };
  revalidateAll();
  return { ok: true, message: t("msg.updated") };
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("transactions").delete().eq("id", id.data).eq("space_id", ctx.space.id);
  if (error) console.error("[budget] delete", error);
  revalidateAll();
}

export async function upsertBudget(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("budget");
  const tc = await getT("common");
  const category = String(formData.get("category") ?? "");
  if (!isCategory("expense", category)) return { ok: false, error: t("error.category") };
  const limit = parseMoneyToCents(formData.get("monthly_limit"));
  if (limit == null) return { ok: false, error: tc("error.amount") };
  if (limit <= 0) return { ok: false, error: t("error.amountPositive") };
  const { error } = await ctx.supabase
    .from("budgets")
    .upsert({ space_id: ctx.space.id, category, monthly_limit_cents: limit }, { onConflict: "space_id,category" });
  if (error) {
    console.error("[budget] upsert budget", error);
    return { ok: false, error: tc("error.generic") };
  }
  revalidateAll();
  return { ok: true, message: t("budgets.saved") };
}

export async function deleteBudget(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("budgets").delete().eq("id", id.data).eq("space_id", ctx.space.id);
  if (error) console.error("[budget] delete budget", error);
  revalidateAll();
}
