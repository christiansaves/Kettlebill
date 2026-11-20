import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { daysUntil, formatDate, formatMoney, monthBounds, todayIso } from "@/lib/format";
import type { Budget, Deadline } from "@/lib/types";
import { Badge, ButtonLink, Card, PageHeader, Progress, SectionTitle, Stat, cx } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { cents, expensesByCategory, fetchTransactions, sumBy } from "./budget/lib";
import { activeRecurringMonthly } from "./rapports/lib";

export default async function Dashboard() {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("dashboard"), getT("common")]);
  const sid = ctx.space.id;
  const today = todayIso();
  const in60 = new Date(Date.parse(`${today}T12:00:00Z`) + 60 * 86_400_000).toISOString().slice(0, 10);
  const { start, end } = monthBounds();

  const count = (table: string) => ctx.supabase.from(table).select("id", { count: "exact", head: true }).eq("space_id", sid);

  const [deadlinesCount, txCount, recurringCount, docsCount, upcomingRes, monthRows, budgetsRes, recurring, expiringRes] = await Promise.all([
    count("deadlines"),
    count("transactions"),
    count("recurring"),
    count("documents"),
    ctx.supabase
      .from("deadlines")
      .select("id, title, due_on, amount_cents")
      .eq("space_id", sid)
      .eq("done", false)
      .order("due_on", { ascending: true })
      .limit(5),
    fetchTransactions(ctx, start, end),
    ctx.supabase.from("budgets").select("id, category, monthly_limit_cents").eq("space_id", sid),
    activeRecurringMonthly(ctx),
    ctx.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("space_id", sid)
      .gte("expires_on", today)
      .lte("expires_on", in60),
  ]);

  const money = (c: number) => formatMoney(c, ctx.currency, ctx.locale);
  const catLabel = (k: string) => tc(`cat.${k}`);
  const firstName = ctx.profile.full_name.trim().split(/\s+/)[0] ?? "";

  // Liste de démarrage
  const steps: { key: string; href: string; done: boolean }[] = [
    { key: "deadline", href: "/app/echeances", done: (deadlinesCount.count ?? 0) > 0 },
    { key: "transaction", href: "/app/budget#ajouter", done: (txCount.count ?? 0) > 0 },
    { key: "subscription", href: "/app/abonnements", done: (recurringCount.count ?? 0) > 0 },
    { key: "document", href: "/app/documents", done: (docsCount.count ?? 0) > 0 },
    { key: "country", href: "/app/reglages", done: ctx.profile.onboarded },
  ];
  const dataSteps = steps.slice(0, 4);
  const showOnboarding = dataSteps.some((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  // Échéances
  const upcoming = (upcomingRes.data ?? []) as Pick<Deadline, "id" | "title" | "due_on" | "amount_cents">[];
  const relative = (iso: string): { text: string; tone: "bad" | "warn" | "neutral" } => {
    const d = daysUntil(iso, today);
    if (d < 0) return { text: tc("date.overdue", { n: -d }), tone: "bad" };
    if (d === 0) return { text: tc("date.today"), tone: "warn" };
    if (d === 1) return { text: tc("date.tomorrow"), tone: "warn" };
    return { text: tc("date.inDays", { n: d }), tone: d <= 7 ? "warn" : "neutral" };
  };

  // Ce mois-ci
  const income = sumBy(monthRows, "income");
  const expenses = sumBy(monthRows, "expense");
  const balance = income - expenses;
  const byCat = expensesByCategory(monthRows);
  const budgets = (budgetsRes.data ?? []) as Pick<Budget, "id" | "category" | "monthly_limit_cents">[];
  const hotBudgets = budgets
    .map((b) => {
      const limit = cents(b.monthly_limit_cents);
      const spent = byCat.get(b.category) ?? 0;
      return { ...b, limit, spent, ratio: limit > 0 ? spent / limit : 0 };
    })
    .filter((b) => b.limit > 0 && b.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio);

  const expiring = expiringRes.count ?? 0;
  const plural = new Intl.PluralRules(ctx.locale);

  const quick: { href: string; label: string; icon: IconName }[] = [
    { href: "/app/scanner", label: tc("nav.scan"), icon: "camera" },
    { href: "/app/echeances", label: t("quick.deadline"), icon: "calendar" },
    { href: "/app/budget#ajouter", label: t("quick.transaction"), icon: "wallet" },
    { href: "/app/abonnements", label: t("quick.subscription"), icon: "repeat" },
    { href: "/app/documents", label: t("quick.document"), icon: "upload" },
    { href: "/app/lettres", label: t("quick.letter"), icon: "mail" },
  ];

  const linkClass = "text-sm font-semibold text-accent underline-offset-2 hover:underline";

  return (
    <>
      <PageHeader title={firstName ? t("greeting", { name: firstName }) : t("greetingNoName")} description={t("subtitle")} />

      <nav aria-label={t("quick.title")} className="mb-6">
        <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {quick.map((q, i) => (
            <li key={q.href + q.label} className={cx(i === quick.length - 1 && "col-span-2 sm:col-span-1")}>
              <Link
                href={q.href}
                className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
              >
                <Icon name="plus" size={16} className="shrink-0 text-accent" />
                <Icon name={q.icon} size={18} className="shrink-0 text-muted" />
                <span className="truncate">{q.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {showOnboarding ? (
        <Card className="mb-6">
          <SectionTitle action={<span className="tabular text-sm text-muted">{t("onboarding.progress", { done: doneCount, total: steps.length })}</span>}>
            {t("onboarding.title")}
          </SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">{t("onboarding.text")}</p>
          <Progress value={doneCount} max={steps.length} label={t("onboarding.progress", { done: doneCount, total: steps.length })} />
          <ol className="mt-4 flex flex-col gap-2">
            {steps.map((s) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2",
                    s.done ? "border-transparent bg-good-bg text-good" : "border-line bg-surface hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cx(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      s.done ? "border-transparent bg-good text-surface" : "border-line",
                    )}
                    aria-hidden="true"
                  >
                    {s.done ? <Icon name="check" size={14} /> : null}
                  </span>
                  <span className={cx("min-w-0 flex-1 font-semibold", s.done && "line-through decoration-1")}>{t(`onboarding.${s.key}`)}</span>
                  <span className="sr-only">{s.done ? t("onboarding.done") : t("onboarding.todo")}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <SectionTitle action={<Link href="/app/echeances" className={linkClass}>{t("upcoming.all")}</Link>}>{t("upcoming.title")}</SectionTitle>
          {upcoming.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Icon name="check" size={18} />
              {t("upcoming.empty")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {upcoming.map((d) => {
                const rel = relative(d.due_on);
                return (
                  <li key={d.id} className={cx("flex items-center gap-3 py-2.5", rel.tone === "bad" && "text-bad")}>
                    {rel.tone === "bad" ? <Icon name="alert" size={18} className="shrink-0" aria-hidden="true" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className={cx("tabular text-sm", rel.tone === "bad" ? "text-bad" : "text-muted")}>
                        {formatDate(d.due_on, ctx.locale)}
                        {d.amount_cents != null ? ` · ${money(cents(d.amount_cents))}` : ""}
                      </p>
                    </div>
                    <Badge tone={rel.tone}>{rel.text}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="min-w-0">
          <SectionTitle action={<Link href="/app/budget" className={linkClass}>{t("month.open")}</Link>}>{t("month.title")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label={t("month.income")} value={money(income)} />
            <Stat label={t("month.expenses")} value={money(expenses)} />
            <Stat label={t("month.balance")} value={money(balance)} tone={balance >= 0 ? "good" : "bad"} />
          </div>
          <div className="mt-4">
            {budgets.length === 0 ? (
              <p className="text-sm text-muted">{t("month.budgetsNone")}</p>
            ) : hotBudgets.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-good">
                <Icon name="check" size={18} />
                {t("month.budgetsOk")}
              </p>
            ) : (
              <>
                <h3 className="mb-2 text-sm font-bold">{t("month.budgetsAlert")}</h3>
                <ul className="flex flex-col gap-3">
                  {hotBudgets.map((b) => (
                    <li key={b.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">{catLabel(b.category)}</span>
                        <span className={cx("tabular shrink-0 text-sm", b.ratio >= 1 ? "font-semibold text-bad" : "text-muted")}>
                          {t("month.spentOf", { spent: money(b.spent), limit: money(b.limit) })}
                        </span>
                      </div>
                      <Progress
                        value={b.spent}
                        max={b.limit}
                        label={t("month.progressLabel", { category: catLabel(b.category), pct: Math.round(b.ratio * 100) })}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <SectionTitle action={<Link href="/app/abonnements" className={linkClass}>{t("subs.link")}</Link>}>{t("subs.title")}</SectionTitle>
          {recurring.count === 0 ? (
            <p className="text-sm text-muted">{t("subs.empty")}</p>
          ) : (
            <>
              <p className="font-display text-2xl font-bold">
                <span className="tabular">{money(recurring.monthly)}</span>{" "}
                <span className="text-base font-semibold text-muted">{t("subs.perMonth")}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{t("subs.count", { n: recurring.count })}</p>
            </>
          )}
        </Card>

        <Card className="min-w-0">
          <SectionTitle action={<Link href="/app/documents" className={linkClass}>{t("docs.link")}</Link>}>{t("docs.title")}</SectionTitle>
          {expiring === 0 ? (
            <p className="text-sm text-muted">{t("docs.none")}</p>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-warn">
              <Icon name="alert" size={18} className="shrink-0" />
              <span className="tabular">{t(plural.select(expiring) === "one" ? "docs.countOne" : "docs.countOther", { n: expiring })}</span>
            </p>
          )}
        </Card>
      </div>

      {ctx.plan === "free" ? (
        <Card className="mt-6 border-transparent bg-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Icon name="sparkle" className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <h2 className="font-bold">{t("plan.title")}</h2>
                <p className="mt-1 text-sm text-muted">{t("plan.text")}</p>
              </div>
            </div>
            <ButtonLink href="/app/reglages/forfait" className="shrink-0">
              {t("plan.cta")}
            </ButtonLink>
          </div>
        </Card>
      ) : null}
    </>
  );
}
