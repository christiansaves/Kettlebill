import "server-only";
import { isConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Vrai si une personne est connectée. Ne plante jamais (Supabase non configuré → false). */
export async function isSignedIn(): Promise<boolean> {
  if (!isConfigured.supabase()) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims?.sub);
  } catch {
    return false;
  }
}
