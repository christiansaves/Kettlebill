import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Client « service » : contourne la RLS. À utiliser UNIQUEMENT dans du code serveur
 * de confiance (webhook Stripe, tâches planifiées, suivi de l'IA), jamais avec une entrée non vérifiée.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
