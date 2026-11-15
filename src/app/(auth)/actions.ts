"use server";
// Actions d'authentification : connexion, lien magique, inscription, mot de passe oublié, nouveau mot de passe.
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isConfigured, publicEnv } from "@/lib/env";
import { getLocale, getT } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";
import { safeNext } from "@/app/auth/safe-next";
import { authErrorKey } from "./auth-errors";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function callbackUrl(next: string) {
  return `${publicEnv.siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

async function fail(key: string): Promise<ActionResult> {
  const t = await getT("auth");
  return { ok: false, error: t(key) };
}

/** Connexion par courriel et mot de passe, puis redirection vers « next ». */
export async function signIn(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!isConfigured.supabase()) return fail("error.config");
  const email = emailSchema.safeParse(str(fd, "email"));
  const password = str(fd, "password");
  if (!email.success) return fail("error.invalidEmail");
  if (!password) return fail("error.invalidCredentials");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return fail(authErrorKey(error));
  redirect(safeNext(str(fd, "next")));
}

/** Envoie un lien de connexion à usage unique (sans créer de compte : l'inscription exige d'accepter les conditions). */
export async function sendMagicLink(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!isConfigured.supabase()) return fail("error.config");
  const email = emailSchema.safeParse(str(fd, "email"));
  if (!email.success) return fail("error.invalidEmail");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(safeNext(str(fd, "next"))) },
  });
  // Pour ne pas révéler quelles adresses ont un compte, seules les limites de débit sont signalées.
  if (error) {
    const key = authErrorKey(error);
    if (key === "error.rateLimit" || key === "error.invalidEmail") return fail(key);
    if (error.status && error.status >= 500) return fail("error.generic");
  }
  const t = await getT("auth");
  return { ok: true, message: t("magic.sent", { email: email.data }) };
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: z.string().min(8).max(72),
  terms: z.literal("on"),
});

/** Inscription : nom et langue dans les métadonnées (repris par le déclencheur SQL qui crée le profil). */
export async function signUp(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!isConfigured.supabase()) return fail("error.config");
  const parsed = signUpSchema.safeParse({
    fullName: str(fd, "full_name"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    terms: str(fd, "terms"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "fullName") return fail("error.nameRequired");
    if (field === "email") return fail("error.invalidEmail");
    if (field === "password") return fail(str(fd, "password").length < 8 ? "error.passwordTooShort" : "error.weakPassword");
    return fail("error.termsRequired");
  }
  const { fullName, email, password } = parsed.data;
  const locale = await getLocale();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, locale },
      emailRedirectTo: callbackUrl(safeNext(str(fd, "next"))),
    },
  });
  if (error) return fail(authErrorKey(error));
  // Adresse déjà confirmée : Supabase renvoie un utilisateur sans identité (aucun courriel n'est envoyé).
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return fail("error.alreadyRegistered");
  }
  // Confirmation par courriel désactivée : la session existe déjà.
  if (data.session) redirect(safeNext(str(fd, "next")));

  const t = await getT("auth");
  return { ok: true, message: t("signup.checkEmail", { email }) };
}

/** Demande de réinitialisation : lien vers /nouveau-mot-de-passe via /auth/callback. */
export async function requestPasswordReset(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!isConfigured.supabase()) return fail("error.config");
  const email = emailSchema.safeParse(str(fd, "email"));
  if (!email.success) return fail("error.invalidEmail");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: callbackUrl("/nouveau-mot-de-passe"),
  });
  if (error && authErrorKey(error) === "error.rateLimit") return fail("error.rateLimit");
  const t = await getT("auth");
  return { ok: true, message: t("forgot.sent", { email: email.data }) };
}

/** Nouveau mot de passe (session obtenue par le lien de réinitialisation). */
export async function updatePassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!isConfigured.supabase()) return fail("error.config");
  const password = str(fd, "password");
  const confirm = str(fd, "confirm");
  if (password.length < 8) return fail("error.passwordTooShort");
  if (password.length > 72) return fail("error.weakPassword");
  if (password !== confirm) return fail("error.passwordMismatch");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return fail("error.session");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(authErrorKey(error));
  redirect("/app");
}
