import { requireContext } from "@/lib/session";
import { isUuid, txtFileName } from "../../letter-utils";

/** GET /app/lettres/<id>/txt → la lettre en texte brut (pièce jointe). */
export async function GET(_request: Request, { params }: RouteContext<"/app/lettres/[id]/txt">) {
  const ctx = await requireContext();
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const { data: letter } = await ctx.supabase
    .from("letters")
    .select("subject, body")
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .maybeSingle<{ subject: string; body: string }>();
  if (!letter) return new Response(null, { status: 404 });

  // BOM UTF-8 + fins de ligne Windows : s'ouvre correctement partout (Bloc-notes compris).
  const text = `﻿${letter.body.replace(/\r?\n/g, "\r\n")}\r\n`;
  const name = txtFileName(letter.subject);
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
