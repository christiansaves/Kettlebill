import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { daysUntil, formatDate, formatMoney, todayIso } from "@/lib/format";
import { isUnlimited } from "@/lib/plans";
import type { Deadline } from "@/lib/types";
import type { T } from "@/lib/i18n/shared";
import { Badge, Card, EmptyState, PageHeader, Progress, SectionTitle, buttonClass, cx } from "@/components/ui";
import { ActionForm, ConfirmButton, Disclosure, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icons";
import { addDeadline, deleteDeadline, markDone, undoDone, updateDeadline } from "./actions";
import { DeadlineFields } from "./fields";
import { KINDS, countActiveDeadlines, deadlineLimit, isKind, relativeLabel, remindLabel } from "./lib";

export default async function DeadlinesPage({ searchParams }: PageProps<"/app/echeances">) {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("deadlines"), getT("common")]);
  const sp = await searchParams;
  const kindParam = Array.isArray(sp.kind) ? sp.kind[0] : sp.kind;
  const kind = isKind(kindParam) ? kindParam : null;
  const today = todayIso();

  let activeQ = ctx.supabase
    .from("deadlines")
    .select("*")
    .eq("space_id", ctx.space.id)
    .eq("done", false)
    .order("due_on", { ascending: true })
    .limit(1000);
  let doneQ = ctx.supabase
    .from("deadlines")
    .select("*")
    .eq("space_id", ctx.space.id)
    .eq("done", true)
    .order("done_at", { ascending: false })
    .limit(30);
  if (kind) {
    activeQ = activeQ.eq("kind", kind);
    doneQ = doneQ.eq("kind", kind);
  }
  const [{ data: active }, { data: done }, used, limit] = await Promise.all([
    activeQ,
    doneQ,
    countActiveDeadlines(ctx),
    deadlineLimit(ctx),
  ]);
  const items = (active ?? []) as Deadline[];
  const doneItems = (done ?? []) as Deadline[];

  const overdue = items.filter((d) => daysUntil(d.due_on, today) < 0);
  const week = items.filter((d) => {
    const n = daysUntil(d.due_on, today);
    return n >= 0 && n <= 7;
  });
  const later = items.filter((d) => daysUntil(d.due_on, today) > 7);

  const limited = !isUnlimited(limit);
  const atLimit = limited && used >= limit;
  const nothingAtAll = used === 0 && doneItems.length === 0 && !kind;

  const itemProps = { t, tc, locale: ctx.locale, currency: ctx.currency, today };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <a href="/app/echeances/calendrier.ics" download className={buttonClass("secondary")} title={t("calendar.hint")}>
            <Icon name="calendar" size={18} />
            {t("calendar.button")}
          </a>
        }
      />

      {limited ? (
        <div className={cx("mb-5 rounded-2xl border p-4", atLimit ? "border-transparent bg-warn-bg" : "border-line bg-surface")}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={cx("tabular font-semibold", atLimit && "text-warn")}>{t("usage.label", { used, limit })}</span>
            <Link href="/app/reglages/forfait" className="font-semibold text-accent underline underline-offset-2">
              {t("usage.upgrade")}
            </Link>
          </div>
          <Progress value={used} max={limit} label={t("usage.label", { used, limit })} />
        </div>
      ) : null}

      <div className="mb-6">
        <Disclosure label={t("add.label")} defaultOpen={nothingAtAll}>
          {atLimit ? (
            <p className="text-sm font-semibold text-warn">{t("error.limit", { limit })}</p>
          ) : (
            <ActionForm action={addDeadline} submitLabel={t("add.submit")} pendingLabel={tc("state.saving")} resetOnSuccess>
              <DeadlineFields t={t} today={today} defaultKind={kind ?? undefined} />
            </ActionForm>
          )}
        </Disclosure>
      </div>

      {nothingAtAll ? (
        <EmptyState title={t("empty.title")} text={t("empty.text")} />
      ) : (
        <>
          <nav aria-label={t("filter.label")} className="mb-5 flex flex-wrap gap-2">
            <Chip href="/app/echeances" active={!kind} label={t("filter.all")} />
            {KINDS.map((k) => (
              <Chip key={k} href={`/app/echeances?kind=${k}`} active={kind === k} label={t(`kind.${k}`)} />
            ))}
          </nav>

          {items.length === 0 && doneItems.length === 0 ? <p className="mb-5 text-muted">{t("filter.empty")}</p> : null}

          <div className="flex flex-col gap-6">
            <Group title={t("group.overdue")} items={overdue} tone="bad" {...itemProps} />
            <Group title={t("group.week")} items={week} {...itemProps} />
            <Group title={t("group.later")} items={later} {...itemProps} />

            {doneItems.length > 0 ? (
              <Disclosure label={t("group.done", { n: doneItems.length })}>
                <p className="mb-3 text-sm text-muted">{t("group.doneHint")}</p>
                <ul className="flex flex-col divide-y divide-line">
                  {doneItems.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-muted line-through">{d.title}</p>
                        <p className="text-sm text-muted">
                          {t(`kind.${d.kind}`)} · {formatDate(d.due_on, ctx.locale)}
                          {d.done_at ? ` · ${t("done.on", { date: formatDate(d.done_at, ctx.locale) })}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={undoDone}>
                          <input type="hidden" name="id" value={d.id} />
                          <SubmitButton variant="secondary" size="sm" className="h-10">
                            {t("action.undo")}
                          </SubmitButton>
                        </form>
                        <ConfirmButton
                          action={deleteDeadline}
                          hidden={{ id: d.id }}
                          label={tc("action.delete")}
                          confirmLabel={tc("action.confirmDelete")}
                          cancelLabel={tc("action.cancel")}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition",
        active ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:bg-surface-2",
      )}
    >
      {label}
    </Link>
  );
}

type ItemProps = { t: T; tc: T; locale: string; currency: string; today: string };

function Group({ title, items, tone, ...p }: { title: string; items: Deadline[]; tone?: "bad" } & ItemProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionTitle>
        <span className={cx(tone === "bad" && "text-bad")}>{title}</span>{" "}
        <span className="tabular text-base font-semibold text-muted">({items.length})</span>
      </SectionTitle>
      <Card>
        <ul className="flex flex-col divide-y divide-line">
          {items.map((d) => (
            <DeadlineItem key={d.id} d={d} {...p} />
          ))}
        </ul>
      </Card>
    </section>
  );
}

function DeadlineItem({ d, t, tc, locale, currency, today }: { d: Deadline } & ItemProps) {
  const n = daysUntil(d.due_on, today);
  const relTone = n < 0 ? "bad" : n <= 1 ? "warn" : "accent";
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words font-semibold">{d.title}</p>
            <Badge>{t(`kind.${d.kind}`)}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <Badge tone={relTone}>{relativeLabel(d.due_on, tc, today)}</Badge>
            <span className="tabular">{formatDate(d.due_on, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            {d.recurrence !== "none" ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="repeat" size={14} />
                {t(`recurrence.${d.recurrence}`)}
              </span>
            ) : null}
            <span>{t("remind.badge", { when: remindLabel(d.remind_days, t) })}</span>
          </p>
          {d.notes ? <p className="mt-2 whitespace-pre-line break-words text-sm">{d.notes}</p> : null}
        </div>
        {d.amount_cents != null ? (
          <p className="tabular shrink-0 text-end font-display text-lg font-bold">{formatMoney(d.amount_cents, currency, locale)}</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <form action={markDone} className="shrink-0">
          <input type="hidden" name="id" value={d.id} />
          <SubmitButton variant="secondary" className="w-full sm:w-auto">
            <Icon name="check" size={18} />
            <span aria-hidden="true">{t("action.done")}</span>
            <span className="sr-only">{t("action.doneAria", { title: d.title })}</span>
          </SubmitButton>
        </form>
        <div className="min-w-0 flex-1">
          <Disclosure label={t("edit.label")}>
            <ActionForm action={updateDeadline} submitLabel={t("edit.submit")} pendingLabel={tc("state.saving")}>
              <DeadlineFields t={t} d={d} today={today} />
            </ActionForm>
            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <ConfirmButton
                action={deleteDeadline}
                hidden={{ id: d.id }}
                label={tc("action.delete")}
                confirmLabel={tc("action.confirmDelete")}
                cancelLabel={tc("action.cancel")}
              />
            </div>
          </Disclosure>
        </div>
      </div>
    </li>
  );
}
