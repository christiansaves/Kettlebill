"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext, SPACE_COOKIE } from "@/lib/session";

/** Change l'espace courant (vérifie que l'utilisateur en est membre). */
export async function switchSpace(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("space_id") ?? "");
  if (!ctx.spaces.some((s) => s.id === id)) return;
  (await cookies()).set(SPACE_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/app", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SPACE_COOKIE);
  redirect("/");
}
