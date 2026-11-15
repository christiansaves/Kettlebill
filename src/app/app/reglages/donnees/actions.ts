"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireContext, SPACE_COOKIE } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { isConfigured } from "@/lib/env";
import type { ActionResult } from "@/lib/types";
import { removeSpaceFiles } from "../storage";

/** Supprime définitivement le compte et toutes les données des espaces dont l'utilisateur est propriétaire. */
export async function deleteAccount(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings");
  const typed = String(fd.get("confirm") ?? "").trim().toUpperCase();
  const accepted = new Set(["SUPPRIMER", "DELETE", t("delete.word").trim().toUpperCase()]);
  if (!accepted.has(typed)) return { ok: false, error: t("delete.wrongWord", { word: t("delete.word") }) };

  // 1. Abonnement Stripe : l'annuler tout de suite pour ne plus rien facturer.
  const subId = ctx.billing?.stripe_subscription_id;
  if (subId && ctx.billing?.status !== "canceled") {
    if (!isConfigured.stripe()) return { ok: false, error: t("delete.stripeNotConfigured") };
    try {
      await getStripe().subscriptions.cancel(subId);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "resource_missing") {
        console.error("[account] stripe cancel", e);
        return { ok: false, error: t("delete.stripeFailed") };
      }
    }
  }

  const admin = createAdminClient();
  try {
    // 2. Fichiers puis espaces dont je suis propriétaire (y compris l'espace personnel).
    const { data: owned } = await admin.from("spaces").select("id").eq("owner_id", ctx.user.id);
    for (const s of owned ?? []) await removeSpaceFiles(s.id as string);
    if (owned?.length) {
      const { error } = await admin.from("spaces").delete().eq("owner_id", ctx.user.id);
      if (error) throw error;
    }
    // 3. Le compte lui-même (le reste suit par cascade).
    const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
    if (error) throw error;
  } catch (e) {
    console.error("[account] delete", e);
    return { ok: false, error: t("delete.failed") };
  }

  try {
    await ctx.supabase.auth.signOut();
  } catch {
    /* la session n'existe plus */
  }
  const jar = await cookies();
  jar.delete(SPACE_COOKIE);
  for (const c of jar.getAll()) if (c.name.startsWith("sb-")) jar.delete(c.name);
  redirect("/?compte=supprime");
}
