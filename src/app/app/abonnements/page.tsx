import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney, todayIso } from "@/lib/format";
import type { Recurring } from "@/lib/types";
import type { T } from "@/lib/i18n/shared";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { ActionForm, ConfirmButton, Disclosure, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icons";
import { addRecurring, createDeadlineFromRecurring, deleteRecurring, setRecurringActive, updateRecurring } from "./actions";
import { RecurringFields } from "./fields";
import { monthlyCents, upcomingCharge } from "./lib";

export default async function RecurringPage() {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("recurring"), getT("common")]);
  const today = todayIso();

  const { data } = await ctx.supabase
    .from("recurring")
    .select("*")
    .eq("space_id", ctx.space.id)
    .order("name", { ascending: true })
    .limit(1000);
  const all = (data ?? []) as Recurring[];
  const byCost = (a: Recurring, b: Recurring) => monthlyCents(b) - monthlyCents(a);
  const active = all.filter((r) => r.active).sort(byCost);
  const paused = all.filter((r) => !r.active).sort(byCost);

  const monthlyTotal = Math.round(active.reduce((s, r) => s + monthlyCents(r), 0));
  const money = (c: number) => formatMoney(c, ctx.currency, ctx.locale);
  const itemProps = { t, tc, money, locale: ctx.locale, today };

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {all.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={t("stats.monthly")} value={money(monthlyTotal)} hint={t("stats.hint")} />
          <Stat label={t("stats.yearly")} value={money(monthlyTotal * 12)} />
          <Stat
            label={t("stats.count")}
            value={active.length}
            hint={paused.length > 0 ? t("stats.paused", { n: paused.length }) : undefined}
          />
        </div>
      ) : null}

      <div className="mb-6">
        <Disclosure label={t("add.label")} defaultOpen={all.length === 0}>
          <ActionForm action={addRecurring} submitLabel={t("add.submit")} pendingLabel={tc("state.saving")} resetOnSuccess>
            <RecurringFields t={t} tc={tc} />
          </ActionForm>
        </Disclosure>
      </div>

      {all.length === 0 ? (
        <EmptyState title={t("empty.title")} text={t("empty.text")} />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 ? (
            <section>
              <SectionTitle>{t("section.active")}</SectionTitle>
              <p className="-mt-2 mb-3 text-sm text-muted">{t("section.sortHint")}</p>
              <Card>
                <ul className="flex flex-col divide-y divide-line">
                  {active.map((r) => (
                    <Item key={r.id} r={r} {...itemProps} />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
          {paused.length > 0 ? (
            <section>
              <SectionTitle>{t("section.paused")}</SectionTitle>
              <Card>
                <ul className="flex flex-col divide-y divide-line">
                  {paused.map((r) => (
                    <Item key={r.id} r={r} {...itemProps} />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

function Item({
  r,
  t,
  tc,
  money,
  locale,
  today,
}: {
  r: Recurring;
  t: T;
  tc: T;
  money: (c: number) => string;
  locale: string;
  today: string;
}) {
  const next = upcomingCharge(r, today);
  const monthly = Math.round(monthlyCents(r));
  const cancelHref = `/app/lettres?template=cancel&recipient=${encodeURIComponent(r.name)}`;
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={r.active ? "break-words font-semibold" : "break-words font-semibold text-muted"}>{r.name}</p>
            <Badge>{tc(`cat.${r.category}`)}</Badge>
            {!r.active ? <Badge tone="warn">{t("item.paused")}</Badge> : null}
          </div>
          <p className="tabular mt-1 text-sm text-muted">
            {t(`per.${r.period}`, { amount: money(r.amount_cents) })}
            {r.period !== "monthly" ? ` · ${t("item.monthlyEquiv", { amount: money(monthly) })}` : ""}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm">
            <Icon name="calendar" size={14} className="text-muted" />
            {next ? t("item.nextCharge", { date: formatDate(next, locale) }) : <span className="text-muted">{t("item.noNextCharge")}</span>}
          </p>
          {r.notes ? <p className="mt-2 whitespace-pre-line break-words text-sm">{r.notes}</p> : null}
        </div>
        <p className="tabular shrink-0 text-end font-display text-lg font-bold">{t("per.monthly", { amount: money(monthly) })}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form action={setRecurringActive}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="active" value={r.active ? "false" : "true"} />
          <SubmitButton variant="secondary">{r.active ? t("action.pause") : t("action.resume")}</SubmitButton>
        </form>
        <ButtonLink href={cancelHref} variant="secondary">
          <Icon name="mail" size={18} />
          {t("action.cancelLetter")}
        </ButtonLink>
        {r.active ? (
          <ActionForm action={createDeadlineFromRecurring} submitLabel={t("action.toDeadline")} pendingLabel={tc("state.saving")} submitVariant="secondary">
            <input type="hidden" name="id" value={r.id} />
          </ActionForm>
        ) : null}
      </div>

      <div className="mt-3">
        <Disclosure label={t("edit.label")}>
          <ActionForm action={updateRecurring} submitLabel={t("edit.submit")} pendingLabel={tc("state.saving")}>
            <RecurringFields t={t} tc={tc} r={r} />
          </ActionForm>
          <div className="mt-4 flex justify-end border-t border-line pt-3">
            <ConfirmButton
              action={deleteRecurring}
              hidden={{ id: r.id }}
              label={tc("action.delete")}
              confirmLabel={tc("action.confirmDelete")}
              cancelLabel={tc("action.cancel")}
            />
          </div>
        </Disclosure>
      </div>
    </li>
  );
}
