"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/session";
import { getT, LOCALE_COOKIE } from "@/lib/i18n/server";
import { isSupported } from "@/lib/i18n/locales";
import { THEME_COOKIE } from "@/lib/theme";
import type { ActionResult } from "@/lib/types";
import { readCountryRegion } from "../fiscalite/countries";

const YEAR = 60 * 60 * 24 * 365;
const cookieOpts = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: YEAR };

export async function saveProfile(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings");

  const fullName = String(fd.get("full_name") ?? "").trim().slice(0, 100);
  const locale = String(fd.get("locale") ?? "");
  if (!isSupported(locale)) return { ok: false, error: t("error.locale") };
  const place = readCountryRegion(fd);
  if (!place) return { ok: false, error: t("error.country") };
  const currency = String(fd.get("currency") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: t("error.currency") };
  const emailReminders = fd.get("email_reminders") === "on";

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      locale,
      country: place.country,
      region: place.region,
      currency,
      email_reminders: emailReminders,
    })
    .eq("id", ctx.user.id);
  if (error) {
    console.error("[settings] profile", error);
    return { ok: false, error: t("error.save") };
  }

  (await cookies()).set(LOCALE_COOKIE, locale, cookieOpts);
  revalidatePath("/", "layout");
  const tNew = await getT("settings", locale);
  return { ok: true, message: tNew("profile.saved") };
}

export async function saveTheme(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("settings");
  const theme = String(fd.get("theme") ?? "");
  if (theme !== "system" && theme !== "light" && theme !== "dark") return { ok: false, error: t("error.theme") };

  const { error } = await ctx.supabase.from("profiles").update({ theme }).eq("id", ctx.user.id);
  if (error) {
    console.error("[settings] theme", error);
    return { ok: false, error: t("error.save") };
  }
  (await cookies()).set(THEME_COOKIE, theme, cookieOpts);
  revalidatePath("/", "layout");
  return { ok: true, message: t("theme.saved") };
}
