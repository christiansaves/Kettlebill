import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { ButtonLink, Card, EmptyState, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cents, expensesByCategory, fetchTransactions, sumBy } from "../budget/lib";
import { activeRecurringMonthly, parseYear } from "./lib";
import { MonthlyChart, type MonthPoint } from "./chart";

export default async function ReportsPage({ searchParams }: PageProps<"/app/rapports">) {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("reports"), getT("common")]);
  const sp = await searchParams;
  const year = parseYear(sp.y);
  const thisYear = new Date().getUTCFullYear();

  const [rows, recurring] = await Promise.all([
    fetchTransactions(ctx, `${year}-01-01`, `${year + 1}-01-01`),
    activeRecurringMonthly(ctx),
  ]);

  const money = (c: number) => formatMoney(c, ctx.currency, ctx.locale);
  const pctFmt = new Intl.NumberFormat(ctx.locale, { style: "percent", maximumFractionDigits: 1 });
  const numFmt = new Intl.NumberFormat(ctx.locale, { maximumFractionDigits: 1 });

  const months: MonthPoint[] = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const r of rows) {
    const mi = Number(r.occurred_on.slice(5, 7)) - 1;
    if (mi < 0 || mi > 11) continue;
    if (r.kind === "income") months[mi].income += cents(r.amount_cents);
    else months[mi].expense += cents(r.amount_cents);
  }
  const income = sumBy(rows, "income");
  const expenses = sumBy(rows, "expense");
  const deductible = rows.reduce((s, r) => (r.kind === "expense" && r.tax_deductible ? s + cents(r.amount_cents) : s), 0);
  const savingsRate = income > 0 ? (income - expenses) / income : null;
  const byCat = [...expensesByCategory(rows).entries()].sort((a, b) => b[1] - a[1]);
  const topCat = byCat[0]?.[1] ?? 0;

  const navBtn = "flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:bg-surface-2";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          rows.length > 0 ? (
            // Lien de téléchargement ordinaire (pas de navigation côté client vers une route API).
            <a href={`/app/rapports/export?y=${year}`} download className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-surface-2">
              <Icon name="upload" size={18} className="rotate-180" />
              {t("export.button")}
            </a>
          ) : null
        }
      />

      <nav aria-label={t("year.nav")} className="mb-5 flex items-center gap-2">
        <Link href={`/app/rapports?y=${year - 1}`} className={navBtn} aria-label={t("year.prev")}>
          <span aria-hidden="true" className="rtl:rotate-180">‹</span>
        </Link>
        <p className="tabular px-2 text-lg font-bold" aria-live="polite">
          {year}
        </p>
        <Link href={`/app/rapports?y=${year + 1}`} className={navBtn} aria-label={t("year.next")}>
          <span aria-hidden="true" className="rtl:rotate-180">›</span>
        </Link>
        {year !== thisYear ? (
          <ButtonLink href="/app/rapports" variant="ghost" size="sm" className="ms-auto h-10 tabular">
            {thisYear}
          </ButtonLink>
        ) : null}
      </nav>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("totals.income")} value={money(income)} />
        <Stat label={t("totals.expenses")} value={money(expenses)} />
        <Stat
          label={t("totals.savingsRate")}
          value={savingsRate == null ? "—" : pctFmt.format(savingsRate)}
          hint={savingsRate == null ? t("totals.savingsNone") : t("totals.savingsHint")}
          tone={savingsRate == null ? undefined : savingsRate >= 0 ? "good" : "bad"}
        />
        <Stat
          label={t("totals.deductible")}
          value={money(deductible)}
          hint={
            <Link href="/app/fiscalite" className="font-semibold text-accent underline-offset-2 hover:underline">
              {t("totals.fiscalLink")}
            </Link>
          }
        />
        <Stat label={t("totals.recurring")} value={money(recurring.monthly)} hint={t("totals.recurringHint", { n: recurring.count })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={t("empty.title", { year })}
          text={t("empty.text")}
          action={<ButtonLink href="/app/budget">{t("empty.cta")}</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="min-w-0">
            <SectionTitle>{t("chart.title")}</SectionTitle>
            <MonthlyChart
              year={year}
              data={months}
              locale={ctx.locale}
              currency={ctx.currency}
              labels={{
                aria: t("chart.aria", { year }),
                income: t("chart.income"),
                expenses: t("chart.expenses"),
                showData: t("chart.showData"),
                caption: t("chart.caption", { year }),
                month: t("table.month"),
                balance: t("table.balance"),
                total: t("table.total"),
              }}
            />
          </Card>

          <Card className="min-w-0">
            <SectionTitle>{t("categories.title")}</SectionTitle>
            {byCat.length === 0 ? (
              <p className="text-sm text-muted">{t("categories.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {byCat.map(([c, v]) => {
                  const share = expenses > 0 ? (v / expenses) * 100 : 0;
                  return (
                    <li key={c}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-semibold">{tc(`cat.${c}`)}</span>
                        <span className="tabular shrink-0 font-semibold">{money(v)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${topCat > 0 ? Math.max(2, (v / topCat) * 100) : 0}%` }} />
                        </div>
                        <span className="tabular w-28 shrink-0 text-end text-xs text-muted">
                          {t("categories.share", { pct: numFmt.format(share) })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
