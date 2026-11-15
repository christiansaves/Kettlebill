import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan, limitsFor, type PlanId, type PlanLimits } from "@/lib/plans";
import type { Billing, Profile, Space } from "@/lib/types";

export const SPACE_COOKIE = "kb_space";

export interface AppContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string };
  profile: Profile;
  billing: Billing | null;
  plan: PlanId;
  limits: PlanLimits;
  spaces: (Space & { role: "owner" | "member" })[];
  space: Space & { role: "owner" | "member" };
  locale: string;
  currency: string;
}

/**
 * Contexte de l'utilisateur connecté : profil, forfait, espaces, espace courant.
 * Redirige vers /connexion si personne n'est connecté. Mis en cache pour la durée de la requête.
 */
export const requireContext = cache(async (): Promise<AppContext> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/connexion");

  const userId = claims.sub as string;
  const email = (claims.email as string | undefined) ?? "";

  const [{ data: profile }, { data: billing }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>(),
    supabase.from("billing").select("*").eq("user_id", userId).maybeSingle<Billing>(),
    supabase
      .from("space_members")
      .select("role, spaces(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  if (!profile) {
    // Le déclencheur SQL crée le profil à l'inscription ; s'il manque, la base n'est pas migrée.
    throw new Error("Profil introuvable : as-tu exécuté supabase/migrations/0001_init.sql ?");
  }

  type Row = { role: "owner" | "member"; spaces: Space | Space[] | null };
  const spaces = ((memberships ?? []) as Row[])
    .map((m) => {
      const s = Array.isArray(m.spaces) ? m.spaces[0] : m.spaces;
      return s ? { ...s, role: m.role } : null;
    })
    .filter((s): s is Space & { role: "owner" | "member" } => Boolean(s))
    .sort((a, b) => (a.kind === "personal" ? -1 : b.kind === "personal" ? 1 : a.created_at.localeCompare(b.created_at)));

  if (spaces.length === 0) throw new Error("Aucun espace : la migration initiale n'a pas créé l'espace personnel.");

  const wanted = (await cookies()).get(SPACE_COOKIE)?.value;
  const space = spaces.find((s) => s.id === wanted) ?? spaces[0];
  const plan = effectivePlan(billing);

  return {
    supabase,
    user: { id: userId, email },
    profile,
    billing: billing ?? null,
    plan,
    limits: limitsFor(plan),
    spaces,
    space,
    locale: profile.locale,
    currency: profile.currency,
  };
});

/** Pour les actions serveur : même contexte, mais sans redirection (retourne null si déconnecté). */
export async function getContextOrNull(): Promise<AppContext | null> {
  try {
    return await requireContext();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) {
      return null;
    }
    throw e;
  }
}

/** Le forfait du PROPRIÉTAIRE de l'espace détermine les limites de cet espace (utile pour les espaces partagés). */
export async function spaceOwnerPlan(ctx: AppContext): Promise<PlanId> {
  if (ctx.space.owner_id === ctx.user.id) return ctx.plan;
  // Les membres ne peuvent pas lire la facturation du propriétaire (RLS) : on applique le forfait du membre,
  // sauf s'il est gratuit, auquel cas on considère l'espace partagé comme « famille » (seul ce forfait permet d'inviter).
  return ctx.plan === "free" ? "family" : ctx.plan;
}
