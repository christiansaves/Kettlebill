// Export iCalendar (RFC 5545) des échéances à venir de l'espace courant.
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatMoney, todayIso } from "@/lib/format";
import type { Deadline } from "@/lib/types";

/** Échappe un texte iCalendar (TEXT) : \ ; , et retours à la ligne. */
function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Replie une ligne à 75 octets UTF-8 (sans couper un caractère multioctet). */
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const max = out.length === 0 ? 75 : 74; // les lignes suivantes commencent par une espace
    if (bytes + b > max) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (iso: string) => iso.replaceAll("-", "");

function nextDay(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const RRULE: Record<Deadline["recurrence"], string | null> = {
  none: null,
  monthly: "FREQ=MONTHLY",
  quarterly: "FREQ=MONTHLY;INTERVAL=3",
  yearly: "FREQ=YEARLY",
};

/** Rappel à 9 h (heure locale du calendrier), remindDays jours avant le début de l'événement « journée entière ». */
function trigger(remindDays: number) {
  if (remindDays <= 0) return "PT9H";
  return remindDays === 1 ? "-PT15H" : `-P${remindDays - 1}DT15H`;
}

export async function GET() {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("deadlines"), getT("common")]);
  const today = todayIso();

  // À venir + récurrentes en retard (leur RRULE produit encore des dates futures).
  const { data, error } = await ctx.supabase
    .from("deadlines")
    .select("*")
    .eq("space_id", ctx.space.id)
    .eq("done", false)
    .or(`due_on.gte.${today},recurrence.neq.none`)
    .order("due_on", { ascending: true })
    .limit(2000);
  if (error) {
    console.error("[deadlines] ics", error);
    return new Response(tc("error.generic"), { status: 500 });
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const spaceName = ctx.space.kind === "personal" ? tc("space.personal") : ctx.space.name;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kettlebill//Echeances//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(t("calendar.name", { space: spaceName }))}`,
  ];

  for (const d of (data ?? []) as Deadline[]) {
    const desc = [t("calendar.kind", { kind: t(`kind.${d.kind}`) })];
    if (d.amount_cents != null) desc.push(t("calendar.amount", { amount: formatMoney(d.amount_cents, ctx.currency, ctx.locale) }));
    if (d.notes) desc.push("", d.notes);
    const rrule = RRULE[d.recurrence];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@kettlebill.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(d.due_on)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(d.due_on))}`,
      `SUMMARY:${icsText(d.title)}`,
      `DESCRIPTION:${icsText(desc.join("\n"))}`,
      `CATEGORIES:${icsText(t(`kind.${d.kind}`))}`,
      "TRANSP:TRANSPARENT",
      ...(rrule ? [`RRULE:${rrule}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(t("calendar.alarm", { title: d.title }))}`,
      `TRIGGER:${trigger(d.remind_days)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  const body = lines.map(fold).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kettlebill-echeances.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
