"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { isSupported } from "@/lib/i18n/locales";
import { isConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Change la langue du site public (témoin) et, si quelqu'un est connecté, celle de son profil. */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "");
  if (!isSupported(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  // getLocale() donne priorité au profil : on le garde cohérent pour une personne connectée.
  if (isConfigured.supabase()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      const uid = data?.claims?.sub;
      if (uid) await supabase.from("profiles").update({ locale }).eq("id", uid);
    } catch {
      /* le témoin suffit */
    }
  }
  revalidatePath("/", "layout");
}
