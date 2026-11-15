import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "documents";

/** Liste récursivement les fichiers sous un préfixe du bucket « documents ». */
async function listAll(admin: ReturnType<typeof createAdminClient>, prefix: string, depth = 0): Promise<string[]> {
  const out: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error || !data) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id == null) {
        if (depth < 5) out.push(...(await listAll(admin, path, depth + 1)));
      } else {
        out.push(path);
      }
    }
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Supprime tous les fichiers d'un espace (chemin « <space_id>/… »).
 * À n'appeler qu'APRÈS avoir vérifié que l'utilisateur est propriétaire de l'espace.
 */
export async function removeSpaceFiles(spaceId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(spaceId)) return;
  const admin = createAdminClient();
  const fromTable = await admin.from("documents").select("storage_path").eq("space_id", spaceId);
  const paths = new Set<string>((fromTable.data ?? []).map((d: { storage_path: string }) => d.storage_path));
  for (const p of await listAll(admin, spaceId)) paths.add(p);
  const all = [...paths].filter((p) => p.startsWith(`${spaceId}/`));
  for (let i = 0; i < all.length; i += 500) {
    const { error } = await admin.storage.from(BUCKET).remove(all.slice(i, i + 500));
    if (error) console.error("[settings] storage remove", error);
  }
}
