import { NextResponse } from "next/server";
import { requireContext } from "@/lib/session";
import { downloadName, isUuid } from "../../doc-utils";

/**
 * GET /app/documents/<id>/telecharger          → téléchargement (pièce jointe)
 * GET /app/documents/<id>/telecharger?voir=1   → affichage dans le navigateur
 * Redirige vers une URL signée valable 60 secondes.
 */
export async function GET(request: Request, { params }: RouteContext<"/app/documents/[id]/telecharger">) {
  const ctx = await requireContext();
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("title, storage_path")
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .maybeSingle<{ title: string; storage_path: string }>();
  if (!doc || !doc.storage_path.startsWith(`${ctx.space.id}/`)) return new NextResponse(null, { status: 404 });

  const inline = new URL(request.url).searchParams.get("voir") === "1";
  const { data, error } = await ctx.supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60, inline ? undefined : { download: downloadName(doc.title, doc.storage_path) });
  if (error || !data?.signedUrl) {
    console.error("[documents] signed url", error);
    return new NextResponse(null, { status: 404 });
  }

  const res = NextResponse.redirect(data.signedUrl, 303);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
