"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, SPACE_COOKIE } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, esc } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import type { ActionResult } from "@/lib/types";
import { removeSpaceFiles } from "../storage";

const uuid = z.uuid();
const nameSchema = z.string().trim().min(1).max(60);
const spaceCookieOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: true, maxAge: 60 * 60 * 24 * 365 };

function done() {
  revalidatePath("/app", "layout");
}

export async function createSpace(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings");
  const name = nameSchema.safeParse(fd.get("name"));
  if (!name.success) return { ok: false, error: t("error.spaceName") };
  const kind = String(fd.get("kind") ?? "");
  if (kind !== "family" && kind !== "business") return { ok: false, error: t("error.spaceKind") };

  const owned = ctx.spaces.filter((s) => s.owner_id === ctx.user.id && s.kind !== "personal").length;
  if (owned >= ctx.limits.spaces) {
    return { ok: false, error: ctx.limits.spaces === 0 ? t("spaces.limitFree") : t("spaces.limit", { limit: ctx.limits.spaces }) };
  }

  // L'identifiant est créé ici : la RLS ne permet pas de relire l'espace avant d'en être membre.
  const id = crypto.randomUUID();
  const { error } = await ctx.supabase.from("spaces").insert({ id, name: name.data, kind, owner_id: ctx.user.id });
  if (error) {
    console.error("[spaces] create", error);
    return { ok: false, error: t("error.save") };
  }
  const { error: mErr } = await ctx.supabase.from("space_members").insert({ space_id: id, user_id: ctx.user.id, role: "owner" });
  if (mErr) {
    console.error("[spaces] owner membership", mErr);
    return { ok: false, error: t("error.save") };
  }
  (await cookies()).set(SPACE_COOKIE, id, spaceCookieOpts);
  done();
  return { ok: true, message: t("spaces.created") };
}

export async function renameSpace(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings");
  const id = uuid.safeParse(fd.get("id"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!name.success) return { ok: false, error: t("error.spaceName") };
  const space = id.success ? ctx.spaces.find((s) => s.id === id.data) : undefined;
  if (!space || space.owner_id !== ctx.user.id || space.role !== "owner" || space.kind === "personal") {
    return { ok: false, error: t("error.ownerOnly") };
  }
  const { error } = await ctx.supabase.from("spaces").update({ name: name.data }).eq("id", space.id).eq("owner_id", ctx.user.id);
  if (error) return { ok: false, error: t("error.save") };
  done();
  return { ok: true, message: t("spaces.renamed") };
}

export async function deleteSpace(fd: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(fd.get("id"));
  const space = id.success ? ctx.spaces.find((s) => s.id === id.data) : undefined;
  if (!space || space.owner_id !== ctx.user.id || space.role !== "owner" || space.kind === "personal") return;

  await removeSpaceFiles(space.id);
  const { error } = await ctx.supabase.from("spaces").delete().eq("id", space.id).eq("owner_id", ctx.user.id);
  if (error) console.error("[spaces] delete", error);
  const jar = await cookies();
  if (jar.get(SPACE_COOKIE)?.value === space.id) jar.delete(SPACE_COOKIE);
  done();
}

export async function leaveSpace(fd: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(fd.get("id"));
  const space = id.success ? ctx.spaces.find((s) => s.id === id.data) : undefined;
  if (!space || space.role !== "member" || space.owner_id === ctx.user.id) return;
  await ctx.supabase.from("space_members").delete().eq("space_id", space.id).eq("user_id", ctx.user.id);
  const jar = await cookies();
  if (jar.get(SPACE_COOKIE)?.value === space.id) jar.delete(SPACE_COOKIE);
  done();
}

export async function removeMember(fd: FormData): Promise<void> {
  const ctx = await requireContext();
  const userId = uuid.safeParse(fd.get("user_id"));
  if (!userId.success || ctx.space.role !== "owner" || userId.data === ctx.user.id || userId.data === ctx.space.owner_id) return;
  await ctx.supabase.from("space_members").delete().eq("space_id", ctx.space.id).eq("user_id", userId.data);
  revalidatePath("/app/reglages/espaces");
}

export async function revokeInvite(fd: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success || ctx.space.role !== "owner") return;
  await ctx.supabase.from("space_invites").delete().eq("id", id.data).eq("space_id", ctx.space.id).is("accepted_at", null);
  revalidatePath("/app/reglages/espaces");
}

export async function inviteMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings", ctx.locale);
  if (ctx.space.role !== "owner") return { ok: false, error: t("error.ownerOnly") };
  if (ctx.space.kind === "personal") return { ok: false, error: t("invite.personal") };
  const email = z.email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, error: t("error.email") };
  if (email.data === ctx.user.email.toLowerCase()) return { ok: false, error: t("invite.self") };

  const [{ data: members }, { data: pending }] = await Promise.all([
    ctx.supabase.from("space_members").select("user_id").eq("space_id", ctx.space.id),
    ctx.supabase.from("space_invites").select("id, email").eq("space_id", ctx.space.id).is("accepted_at", null),
  ]);
  if ((pending ?? []).some((p) => String(p.email).toLowerCase() === email.data)) return { ok: false, error: t("invite.alreadyPending") };

  // Déjà membre ? (courriels lus avec le client service, pour cet espace seulement)
  const admin = createAdminClient();
  for (const m of members ?? []) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    if (data?.user?.email?.toLowerCase() === email.data) return { ok: false, error: t("invite.alreadyMember") };
  }

  const limit = ctx.limits.membersPerSpace;
  if ((members?.length ?? 0) + (pending?.length ?? 0) >= limit) {
    return { ok: false, error: t("invite.limit", { limit }) };
  }

  const { data: invite, error } = await ctx.supabase
    .from("space_invites")
    .insert({ space_id: ctx.space.id, email: email.data, invited_by: ctx.user.id })
    .select("token")
    .single();
  if (error || !invite) {
    console.error("[spaces] invite", error);
    return { ok: false, error: t("error.save") };
  }

  const link = `${publicEnv.siteUrl().replace(/\/$/, "")}/invitation/${invite.token}`;
  const inviter = ctx.profile.full_name || ctx.user.email;
  const vars = { name: inviter, space: ctx.space.name };
  const html = emailLayout(
    t("email.title", vars),
    `<p style="margin:0 0 16px;line-height:1.5">${esc(t("email.body", vars))}</p>
<p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:#0E6B6B;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">${esc(t("email.button"))}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#56676F">${esc(t("email.linkText"))}<br><a href="${esc(link)}" style="color:#0E6B6B;word-break:break-all">${esc(link)}</a></p>
<p style="margin:0;font-size:13px;color:#56676F">${esc(t("email.ignore"))}</p>`,
    t("email.footer"),
  );
  const text = `${t("email.body", vars)}\n\n${t("email.linkText")}\n${link}\n\n${t("email.ignore")}`;
  const sent = await sendEmail({ to: email.data, subject: t("email.subject", vars), html, text });

  revalidatePath("/app/reglages/espaces");
  return { ok: true, message: sent ? t("invite.sent", { email: email.data }) : t("invite.createdNoEmail", { link }) };
}
