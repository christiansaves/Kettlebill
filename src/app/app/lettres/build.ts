import "server-only";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney, intlLocale, parseMoneyToCents, todayIso } from "@/lib/format";
import { TEMPLATE_FIELDS, fill, type FieldKey, type TemplateId } from "./letter-utils";

/** Les modèles n'existent qu'en français et en anglais ; les autres langues utilisent l'anglais. */
export function templateLocale(locale: string): "fr" | "en" {
  return locale === "fr" || locale.startsWith("fr-") ? "fr" : "en";
}

/** Assemble l'objet et le corps d'une lettre à partir d'un modèle et des valeurs saisies. */
export async function buildLetter(
  template: TemplateId,
  values: Partial<Record<FieldKey, string>>,
  opts: { locale: string; country: string; currency: string },
): Promise<{ subject: string; body: string }> {
  const loc = templateLocale(opts.locale);
  const tt = await getT("letters", loc);
  const fmtLocale = intlLocale(loc, opts.country);
  const fields = TEMPLATE_FIELDS[template];

  const v: Record<string, string> = {};
  for (const f of fields) {
    const raw = (values[f.key] ?? "").trim();
    if (!raw) {
      v[f.key] = f.omitIfEmpty ? "" : tt(`ph.${f.key}`);
      continue;
    }
    if (f.type === "date") {
      v[f.key] = formatDate(raw, fmtLocale, { day: "numeric", month: "long", year: "numeric" });
    } else if (f.type === "amount") {
      const cents = parseMoneyToCents(raw);
      v[f.key] = cents == null ? raw : formatMoney(cents, opts.currency, fmtLocale);
    } else {
      v[f.key] = raw;
    }
  }
  v.reasonLine = v.reason ? `\n\n${fill(tt("tpl.reasonLine"), { reason: v.reason })}` : "";

  const subject = fill(tt(`tpl.${template}.subject`), v).replace(/\s+/g, " ").trim().slice(0, 200);
  const core = fill(tt(`tpl.${template}.body`), v);
  const date = formatDate(todayIso(), fmtLocale, { day: "numeric", month: "long", year: "numeric" });

  const blocks = [
    [v.myName, v.myAddress].filter(Boolean).join("\n"),
    fill(tt("tpl.dateLine"), { date }),
    [v.recipient, v.recipientAddress].filter(Boolean).join("\n"),
    fill(tt("tpl.subjectLine"), { subject }),
    tt("tpl.greeting"),
    core,
    tt("tpl.closing"),
    v.myName,
  ];
  const body = blocks
    .filter((b) => b.trim())
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { subject, body };
}
