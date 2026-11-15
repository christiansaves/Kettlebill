"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireContext, SPACE_COOKIE } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isInviteExpired } from "@/app/app/reglages/espaces/constants";

const TOKEN = /^[0-9a-f]{48}$/;

/** Accepte une invitation : seulement si le courriel du compte correspond à celui de l'invitation. */
export async function acceptInvite(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  if (!TOKEN.test(token)) redirect("/app");
  const ctx = await requireContext();
  const back = `/invitation/${token}`;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("space_invites")
    .select("id, space_id, email, accepted_at, created_at")
    .eq("token", token)
    .maybeSingle();
  if (!invite || invite.accepted_at || isInviteExpired(invite.created_at)) redirect(back);
  if (String(invite.email).toLowerCase() !== ctx.user.email.toLowerCase()) redirect(back);

  const already = ctx.spaces.some((s) => s.id === invite.space_id);
  if (!already) {
    // On « réserve » l'invitation d'abord (une seule acceptation possible), puis on ajoute le membre.
    const { data: claimed } = await admin
      .from("space_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("accepted_at", null)
      .select("id");
    if (!claimed?.length) redirect(back);
    const { error } = await admin
      .from("space_members")
      .upsert({ space_id: invite.space_id, user_id: ctx.user.id, role: "member" }, { onConflict: "space_id,user_id", ignoreDuplicates: true });
    if (error) {
      console.error("[invitation] membership", error);
      await admin.from("space_invites").update({ accepted_at: null }).eq("id", invite.id);
      redirect(`${back}?erreur=1`);
    }
  } else {
    await admin.from("space_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id).is("accepted_at", null);
  }

  (await cookies()).set(SPACE_COOKIE, invite.space_id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
  redirect("/app");
}

/** Se déconnecter pour se reconnecter avec le bon compte, puis revenir à l'invitation. */
export async function switchAccount(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SPACE_COOKIE);
  redirect(TOKEN.test(token) ? `/connexion?next=${encodeURIComponent(`/invitation/${token}`)}` : "/connexion");
}
