// Liens de courriel avec token_hash (modèles de courriel Supabase personnalisés) : vérifie le jeton puis redirige.
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { safeNext } from "../safe-next";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const type = TYPES.find((t) => t === rawType);
  const next = safeNext(url.searchParams.get("next"), type === "recovery" ? "/nouveau-mot-de-passe" : "/app");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/connexion?error=${reason}`, url.origin));

  if (!isConfigured.supabase()) return fail("config");
  if (!tokenHash || !type) return fail("link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail(error.code === "otp_expired" ? "otp_expired" : "link");
  return NextResponse.redirect(new URL(next, url.origin));
}
