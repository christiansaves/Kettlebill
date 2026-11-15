// Retour des liens Supabase (PKCE) : échange le code contre une session, puis redirige vers « next ».
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { safeNext } from "../safe-next";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/connexion?error=${reason}`, url.origin));

  if (!isConfigured.supabase()) return fail("config");
  // Supabase renvoie ?error_code=otp_expired (etc.) quand le lien n'est plus valide.
  if (url.searchParams.get("error_code") === "otp_expired") return fail("otp_expired");
  if (!code) return fail("link");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("link");
  return NextResponse.redirect(new URL(next, url.origin));
}
