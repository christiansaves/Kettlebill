// Tâche planifiée quotidienne (Vercel Cron) : rappels d'échéances par courriel.
// Envoie un rappel quand aujourd'hui est dans [due_on - remind_days, due_on], puis un rappel « en retard »
// le lendemain de l'échéance. reminder_log empêche les doublons :
//   - rappel avant / le jour même → clé (deadline_id, due_on)
//   - rappel « en retard »        → clé (deadline_id, due_on + 1 jour), pour qu'il puisse suivre le premier rappel.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { emailLayout, esc, sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n/server";
import { isSupported, SOURCE_LOCALE } from "@/lib/i18n/locales";
import type { T } from "@/lib/i18n/shared";
import { daysUntil, formatDate, formatMoney, todayIso } from "@/lib/format";
import type { Deadline, Profile, Space } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PER_RUN = 500;
const TIME_BUDGET_MS = 270_000; // on s'arrête avant maxDuration ; le reste partira au prochain passage
const MIN_SEND_INTERVAL_MS = 550; // limite de débit de Resend (≈ 2 requêtes / s)
const CHUNK = 200;

type Row = Pick<Deadline, "id" | "space_id" | "title" | "kind" | "due_on" | "amount_cents" | "recurrence" | "remind_days" | "notes">;
type Recipient = Pick<Profile, "id" | "full_name" | "locale" | "currency">;
type Kind = "upcoming" | "today" | "overdue";

function shiftDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function authorized(req: Request) {
  let secret: string;
  try {
    secret = serverEnv.cronSecret();
  } catch {
    return false;
  }
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const started = Date.now();
  const admin = createAdminClient();
  const today = todayIso();
  const yesterday = shiftDays(today, -1);

  // 1. Échéances candidates (remind_days ≤ 90 en base).
  const { data: rows, error } = await admin
    .from("deadlines")
    .select("id, space_id, title, kind, due_on, amount_cents, recurrence, remind_days, notes")
    .eq("done", false)
    .gte("due_on", yesterday)
    .lte("due_on", shiftDays(today, 90))
    .order("due_on", { ascending: true })
    .limit(10_000);
  if (error) {
    console.error("[cron/reminders] select deadlines", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const due = ((rows ?? []) as Row[])
    .map((d) => {
      const n = daysUntil(d.due_on, today);
      if (n === -1) return { d, n, kind: "overdue" as Kind, logKey: today };
      if (n >= 0 && n <= d.remind_days) return { d, n, kind: (n === 0 ? "today" : "upcoming") as Kind, logKey: d.due_on };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const checked = due.length;
  let sent = 0;
  let skipped = 0;

  // 2. Déjà rappelées ?
  const logged = new Set<string>();
  for (const ids of chunks([...new Set(due.map((x) => x.d.id))])) {
    const { data } = await admin.from("reminder_log").select("deadline_id, due_on").in("deadline_id", ids);
    for (const l of data ?? []) logged.add(`${l.deadline_id}|${l.due_on}`);
  }
  const todo = due.filter((x) => !logged.has(`${x.d.id}|${x.logKey}`));
  skipped += due.length - todo.length;
  const batch = todo.slice(0, MAX_PER_RUN);
  skipped += todo.length - batch.length;

  // 3. Membres, profils (rappels activés) et espaces concernés.
  const spaceIds = [...new Set(batch.map((x) => x.d.space_id))];
  const membersBySpace = new Map<string, string[]>();
  const spaces = new Map<string, Pick<Space, "id" | "name" | "kind">>();
  for (const ids of chunks(spaceIds)) {
    const [{ data: m }, { data: s }] = await Promise.all([
      admin.from("space_members").select("space_id, user_id").in("space_id", ids),
      admin.from("spaces").select("id, name, kind").in("id", ids),
    ]);
    for (const row of m ?? []) membersBySpace.set(row.space_id, [...(membersBySpace.get(row.space_id) ?? []), row.user_id]);
    for (const row of s ?? []) spaces.set(row.id, row);
  }
  const profiles = new Map<string, Recipient>();
  for (const ids of chunks([...new Set([...membersBySpace.values()].flat())])) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, locale, currency")
      .in("id", ids)
      .eq("email_reminders", true);
    for (const p of (data ?? []) as Recipient[]) profiles.set(p.id, p);
  }

  // Caches pour la durée de l'exécution.
  const emails = new Map<string, string | null>();
  async function emailOf(userId: string) {
    if (emails.has(userId)) return emails.get(userId)!;
    let email: string | null = null;
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data.user?.email ?? null;
    } catch (e) {
      console.error("[cron/reminders] getUserById", userId, e);
    }
    emails.set(userId, email);
    return email;
  }
  const texts = new Map<string, { t: T; tc: T }>();
  async function textsFor(locale: string) {
    const loc = isSupported(locale) ? locale : SOURCE_LOCALE;
    let x = texts.get(loc);
    if (!x) {
      const [t, tc] = await Promise.all([getT("deadlines", loc), getT("common", loc)]);
      x = { t, tc };
      texts.set(loc, x);
    }
    return { ...x, loc };
  }

  const site = publicEnv.siteUrl().replace(/\/$/, "");
  let lastSend = 0;
  let outOfTime = false;

  // 4. Envoi : une erreur sur une échéance n'arrête pas les autres.
  for (const item of batch) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      outOfTime = true;
      skipped++;
      continue;
    }
    try {
      const recipients = (membersBySpace.get(item.d.space_id) ?? []).map((id) => profiles.get(id)).filter((p): p is Recipient => !!p);
      const space = spaces.get(item.d.space_id);
      let ok = 0;
      let failed = 0;
      for (const p of recipients) {
        try {
          const to = await emailOf(p.id);
          if (!to) continue;
          const { t, tc, loc } = await textsFor(p.locale);
          const msg = compose({ item, p, t, tc, loc, space, site });
          const wait = lastSend + MIN_SEND_INTERVAL_MS - Date.now();
          if (wait > 0) await sleep(wait);
          lastSend = Date.now();
          if (await sendEmail({ to, ...msg })) {
            ok++;
            sent++;
          } else failed++;
        } catch (e) {
          failed++;
          console.error("[cron/reminders] send", item.d.id, p.id, e);
        }
      }
      // Tout a échoué → pas de journal : on réessaiera au prochain passage.
      if (failed > 0 && ok === 0) {
        skipped++;
        continue;
      }
      if (ok === 0) skipped++;
      const { error: logErr } = await admin
        .from("reminder_log")
        .upsert({ deadline_id: item.d.id, due_on: item.logKey }, { onConflict: "deadline_id,due_on", ignoreDuplicates: true });
      if (logErr) console.error("[cron/reminders] log", item.d.id, logErr);
    } catch (e) {
      skipped++;
      console.error("[cron/reminders] deadline", item.d.id, e);
    }
  }

  if (outOfTime) console.warn("[cron/reminders] budget de temps atteint, reste reporté");
  return NextResponse.json({ checked, sent, skipped });
}

function compose({
  item,
  p,
  t,
  tc,
  loc,
  space,
  site,
}: {
  item: { d: Row; n: number; kind: Kind };
  p: Recipient;
  t: T;
  tc: T;
  loc: string;
  space?: Pick<Space, "name" | "kind">;
  site: string;
}) {
  const { d, n, kind } = item;
  const date = formatDate(d.due_on, loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const vars = { title: d.title, date, n };
  const subject = t(`email.subject.${kind}`, vars);
  const heading = t(`email.heading.${kind}`);
  const firstName = p.full_name.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? t("email.greeting", { name: firstName }) : t("email.greetingNoName");
  const intro = t(kind === "upcoming" && n === 1 ? "email.intro.tomorrow" : `email.intro.${kind}`, vars);

  const details: [string, string][] = [[t("email.details.date"), date]];
  if (d.amount_cents != null) details.push([t("email.details.amount"), formatMoney(d.amount_cents, p.currency, loc)]);
  details.push([t("email.details.kind"), t(`kind.${d.kind}`)]);
  if (d.recurrence !== "none") details.push([t("email.details.recurrence"), t(`recurrence.${d.recurrence}`)]);
  if (space && space.kind !== "personal") details.push([t("email.details.space"), space.name]);
  if (d.notes) details.push([t("email.details.notes"), d.notes]);

  const link = `${site}/app/echeances`;
  const settings = `${site}/app/reglages`;
  const rowsHtml = details
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#56676F;font-size:14px;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
        `<td style="padding:6px 0;font-size:14px;white-space:pre-line">${esc(v)}</td></tr>`,
    )
    .join("");
  const body =
    `<p style="margin:0 0 12px;font-size:15px">${esc(greeting)}</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${esc(intro)}</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">${rowsHtml}</table>` +
    `<p style="margin:0 0 16px"><a href="${esc(link)}" style="display:inline-block;background:#0E6B6B;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">${esc(t("email.cta"))}</a></p>` +
    `<p style="margin:0;font-size:13px"><a href="${esc(settings)}" style="color:#0E6B6B">${esc(t("email.settings"))}</a></p>`;

  const text = [
    greeting,
    "",
    intro,
    "",
    ...details.map(([k, v]) => `${k}: ${v}`),
    "",
    `${t("email.cta")}: ${link}`,
    `${t("email.settings")}: ${settings}`,
    "",
    t("email.footer"),
    tc("footer.disclaimer"),
  ].join("\n");

  return { subject, html: emailLayout(heading, body, t("email.footer")), text };
}
