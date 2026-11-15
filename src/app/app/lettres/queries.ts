import "server-only";
import { monthBounds } from "@/lib/format";
import type { AppContext } from "@/lib/session";

/** Nombre de lettres créées ce mois-ci (UTC) dans l'espace courant. */
export async function lettersThisMonth(ctx: AppContext): Promise<number> {
  const { start } = monthBounds();
  const { count } = await ctx.supabase
    .from("letters")
    .select("id", { count: "exact", head: true })
    .eq("space_id", ctx.space.id)
    .gte("created_at", `${start}T00:00:00Z`);
  return count ?? 0;
}
