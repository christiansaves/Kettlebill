// Export CSV des transactions d'une année (espace courant).
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { cents, fetchTransactions } from "../../budget/lib";
import { parseYear } from "../lib";

/** Échappe une cellule CSV ; neutralise aussi les formules (=, +, -, @) pour les tableurs. */
function cell(v: string) {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(request: Request) {
  const ctx = await requireContext();
  const url = new URL(request.url);
  const year = parseYear(url.searchParams.get("y") ?? undefined);
  const [t, tc] = await Promise.all([getT("reports", ctx.locale), getT("common", ctx.locale)]);

  const rows = await fetchTransactions(ctx, `${year}-01-01`, `${year + 1}-01-01`);
  rows.reverse(); // ordre chronologique

  const header = ["csv.date", "csv.type", "csv.category", "csv.label", "csv.amount", "csv.currency", "csv.deductible"].map((k) => t(k));
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.occurred_on,
        r.kind === "income" ? t("csv.income") : t("csv.expense"),
        tc(`cat.${r.category}`),
        r.label ?? "",
        (cents(r.amount_cents) / 100).toFixed(2),
        r.currency,
        r.tax_deductible ? t("csv.yes") : t("csv.no"),
      ]
        .map(cell)
        .join(","),
    );
  }
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kettlebill-${year}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
