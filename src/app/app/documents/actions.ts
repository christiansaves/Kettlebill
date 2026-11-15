"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, type AppContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { isUnlimited } from "@/lib/plans";
import type { ActionResult } from "@/lib/types";
import {
  MAX_FILE_BYTES,
  isDocCategory,
  isUuid,
  isValidStoragePath,
  mimeForName,
  sanitizeFileName,
} from "./doc-utils";

const BUCKET = "documents";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s: string) {
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

async function documentCount(ctx: AppContext) {
  const { count } = await ctx.supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("space_id", ctx.space.id);
  return count ?? 0;
}

function revalidate() {
  revalidatePath("/app/documents");
}

export type PrepareResult = { ok: true; path: string; contentType: string } | { ok: false; error: string };

/** Étape 1 : vérifie les droits, la limite du forfait, la taille et le type ; retourne un chemin de stockage sûr. */
export async function prepareUpload(input: { name: string; size: number }): Promise<PrepareResult> {
  const ctx = await requireContext();
  const t = await getT("documents");
  const parsed = z.object({ name: z.string().min(1).max(500), size: z.number().int() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: t("error.noFile") };
  const { name, size } = parsed.data;

  if (size <= 0) return { ok: false, error: t("error.empty") };
  if (size > MAX_FILE_BYTES) return { ok: false, error: t("error.tooBig") };
  const contentType = mimeForName(name);
  if (!contentType) return { ok: false, error: t("error.type") };

  const limit = ctx.limits.documents;
  if (!isUnlimited(limit) && (await documentCount(ctx)) >= limit) {
    return { ok: false, error: t("error.limit", { limit }) };
  }

  return { ok: true, path: `${ctx.space.id}/${crypto.randomUUID()}-${sanitizeFileName(name)}`, contentType };
}

const registerSchema = z.object({
  path: z.string().min(1).max(200),
  title: z.string().max(200),
  category: z.string().max(40),
  expiresOn: z.string().max(10),
  remind: z.boolean(),
});

/** Étape 3 : après l'envoi par le navigateur, vérifie le fichier et enregistre la ligne (+ échéance facultative). */
export async function registerDocument(input: z.input<typeof registerSchema>): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("documents");
  const tc = await getT("common");
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tc("error.generic") };
  const { path, category, remind } = parsed.data;
  const title = parsed.data.title.trim();
  const expiresOn = parsed.data.expiresOn.trim();

  // Ne jamais faire confiance au chemin fourni par le client : préfixe de l'espace courant + forme exacte.
  if (!isValidStoragePath(path, ctx.space.id)) return { ok: false, error: t("error.path") };
  if (!title) return { ok: false, error: t("error.title") };
  if (!isDocCategory(category)) return { ok: false, error: t("error.category") };
  if (expiresOn && !validDate(expiresOn)) return { ok: false, error: t("error.date") };
  if (remind && !expiresOn) return { ok: false, error: t("error.remindNeedsDate") };

  const fileName = path.slice(ctx.space.id.length + 1);
  const storage = ctx.supabase.storage.from(BUCKET);
  const { data: found, error: listError } = await storage.list(ctx.space.id, { search: fileName, limit: 10 });
  const obj = found?.find((f) => f.name === fileName);
  if (listError || !obj) return { ok: false, error: t("error.missing") };

  const size = Number(obj.metadata?.size ?? 0);
  const contentType = mimeForName(fileName);
  const removeObject = () => storage.remove([path]);
  if (!contentType) {
    await removeObject();
    return { ok: false, error: t("error.type") };
  }
  if (size > MAX_FILE_BYTES) {
    await removeObject();
    return { ok: false, error: t("error.tooBig") };
  }

  // Revérifie la limite (deux onglets pourraient téléverser en même temps).
  const limit = ctx.limits.documents;
  if (!isUnlimited(limit) && (await documentCount(ctx)) >= limit) {
    await removeObject();
    return { ok: false, error: t("error.limit", { limit }) };
  }

  const { error: insertError } = await ctx.supabase.from("documents").insert({
    space_id: ctx.space.id,
    title: title.slice(0, 200),
    storage_path: path,
    mime_type: contentType,
    size_bytes: size,
    category,
    expires_on: expiresOn || null,
    uploaded_by: ctx.user.id,
  });
  if (insertError) {
    // 23505 : chemin déjà enregistré (double envoi) — on ne supprime pas le fichier existant.
    if (insertError.code !== "23505") await removeObject();
    console.error("[documents] insert", insertError);
    return { ok: false, error: tc("error.generic") };
  }

  let message = t("upload.done");
  if (remind && expiresOn) {
    const dlLimit = ctx.limits.deadlines;
    let allowed = true;
    if (!isUnlimited(dlLimit)) {
      const { count } = await ctx.supabase
        .from("deadlines")
        .select("id", { count: "exact", head: true })
        .eq("space_id", ctx.space.id)
        .eq("done", false);
      allowed = (count ?? 0) < dlLimit;
    }
    if (allowed) {
      const { error: dlError } = await ctx.supabase.from("deadlines").insert({
        space_id: ctx.space.id,
        title: t("deadline.title", { title: title.slice(0, 160) }),
        kind: "document",
        due_on: expiresOn,
        recurrence: "none",
        remind_days: 30,
        notes: t("deadline.notes"),
        created_by: ctx.user.id,
      });
      if (dlError) {
        console.error("[documents] deadline", dlError);
        message = t("upload.doneNoReminder");
      } else {
        revalidatePath("/app/echeances");
      }
    } else {
      message = t("upload.doneNoReminder");
    }
  }

  revalidate();
  return { ok: true, message };
}

/** Modifier le titre, la catégorie ou la date d'expiration. */
export async function updateDocument(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("documents");
  const tc = await getT("common");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const expiresOn = String(formData.get("expires_on") ?? "").trim();

  if (!isUuid(id)) return { ok: false, error: t("error.notFound") };
  if (!title) return { ok: false, error: t("error.title") };
  if (!isDocCategory(category)) return { ok: false, error: t("error.category") };
  if (expiresOn && !validDate(expiresOn)) return { ok: false, error: t("error.date") };

  const { data, error } = await ctx.supabase
    .from("documents")
    .update({ title: title.slice(0, 200), category, expires_on: expiresOn || null })
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .select("id");
  if (error) {
    console.error("[documents] update", error);
    return { ok: false, error: tc("error.generic") };
  }
  if (!data?.length) return { ok: false, error: t("error.notFound") };
  revalidate();
  return { ok: true, message: t("edit.saved") };
}

/** Supprime le fichier du stockage puis la ligne. */
export async function deleteDocument(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .maybeSingle<{ id: string; storage_path: string }>();
  if (!doc) return;
  if (doc.storage_path.startsWith(`${ctx.space.id}/`)) {
    const { error } = await ctx.supabase.storage.from(BUCKET).remove([doc.storage_path]);
    if (error) console.error("[documents] remove object", error);
  }
  await ctx.supabase.from("documents").delete().eq("id", id).eq("space_id", ctx.space.id);
  revalidate();
}
