import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney, monthBounds, todayIso } from "@/lib/format";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import type { Budget } from "@/lib/types";
import { Badge, ButtonLink, Card, EmptyState, Field, Input, PageHeader, Progress, SectionTitle, Select, Stat, cx } from "@/components/ui";
import { ActionForm, ConfirmButton, Disclosure } from "@/components/forms";
import { Icon } from "@/components/icons";
import { createTransaction, deleteBudget, deleteTransaction, updateTransaction, upsertBudget } from "./actions";
import { cents, expensesByCategory, fetchTransactions, shiftMonth, sumBy, type TxRow } from "./lib";
import { TransactionFields, type TransactionFieldsLabels } from "./transaction-fields";
import { EditableRow } from "./edit-row";

export default async function BudgetPage({ searchParams }: PageProps<"/app/budget">) {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("budget"), getT("common")]);
  const sp = await searchParams;
  const m = typeof sp.m === "string" ? sp.m : undefined;
  const { month, start, end } = monthBounds(m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : undefined);
  const today = todayIso();
  const currentMonth = today.slice(0, 7);

  const [rows, budgetsRes] = await Promise.all([
    fetchTransactions(ctx, start, end),
    ctx.supabase.from("budgets").select("id, category, monthly_limit_cents").eq("space_id", ctx.space.id),
  ]);
  const budgets = ((budgetsRes.data ?? []) as Pick<Budget, "id" | "category" | "monthly_limit_cents">[]).map((b) => ({
    ...b,
    monthly_limit_cents: cents(b.monthly_limit_cents),
  }));

  const money = (c: number) => formatMoney(c, ctx.currency, ctx.locale);
  const catLabel = (k: string) => tc(`cat.${k}`);
  const income = sumBy(rows, "income");
  const expenses = sumBy(rows, "expense");
  const balance = income - expenses;
  const byCat = expensesByCategory(rows);

  const monthTitle = new Intl.DateTimeFormat(ctx.locale, { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  const labels: TransactionFieldsLabels = {
    kind: t("form.kind"),
    income: t("kind.income"),
    expense: t("kind.expense"),
    amount: t("form.amount"),
    amountHint: t("form.amountHint", { currency: ctx.currency }),
    category: t("form.category"),
    label: t("form.label"),
    labelPlaceholder: t("form.labelPlaceholder"),
    date: t("form.date"),
    deductible: t("form.deductible"),
    deductibleHint: t("form.deductibleHint"),
  };
  const categories = {
    income: INCOME_CATEGORIES.map((c) => ({ value: c, label: catLabel(c) })),
    expense: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: catLabel(c) })),
  };
  const defaultDate = today >= start && today < end ? today : start;

  const editForm = (r: TxRow) => (
    <ActionForm action={updateTransaction} submitLabel={t("form.submitSave")} pendingLabel={tc("state.saving")}>
      <input type="hidden" name="id" value={r.id} />
      <TransactionFields
        labels={labels}
        categories={categories}
        defaults={{
          kind: r.kind,
          amount: (cents(r.amount_cents) / 100).toFixed(2),
          category: r.category,
          label: r.label,
          date: r.occurred_on,
          deductible: r.tax_deductible,
        }}
      />
    </ActionForm>
  );
  const deleteBtn = (id: string) => (
    <ConfirmButton
      action={deleteTransaction}
      hidden={{ id }}
      label={tc("action.delete")}
      confirmLabel={tc("action.confirmDelete")}
      cancelLabel={tc("action.cancel")}
    />
  );
  const amountText = (r: TxRow) => (r.kind === "income" ? "+" : "−") + money(cents(r.amount_cents));

  const budgetCats = new Set(budgets.map((b) => b.category));
  const unbudgeted = [...byCat.entries()].filter(([c]) => !budgetCats.has(c)).sort((a, b) => b[1] - a[1]);
  const budgetRows = budgets
    .map((b) => ({ ...b, spent: byCat.get(b.category) ?? 0 }))
    .sort((a, b) => catLabel(a.category).localeCompare(catLabel(b.category), ctx.locale));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <nav aria-label={t("month.nav")} className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/app/budget?m=${prev}`} className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:bg-surface-2" aria-label={t("month.prev")}>
          <span aria-hidden="true" className="rtl:rotate-180">‹</span>
        </Link>
        <p className="min-w-0 px-2 text-lg font-bold first-letter:uppercase" aria-live="polite">
          {monthTitle}
        </p>
        <Link href={`/app/budget?m=${next}`} className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:bg-surface-2" aria-label={t("month.next")}>
          <span aria-hidden="true" className="rtl:rotate-180">›</span>
        </Link>
        {month !== currentMonth ? (
          <ButtonLink href="/app/budget" variant="ghost" size="sm" className="ms-auto h-10">
            {t("month.current")}
          </ButtonLink>
        ) : null}
      </nav>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label={t("stat.income")} value={money(income)} />
        <Stat label={t("stat.expenses")} value={money(expenses)} />
        <Stat label={t("stat.balance")} value={money(balance)} hint={t("stat.balanceHint")} tone={balance >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card id="ajouter" className="scroll-mt-24">
            <SectionTitle>{t("add.title")}</SectionTitle>
            <ActionForm action={createTransaction} submitLabel={t("form.submitAdd")} pendingLabel={tc("state.saving")} resetOnSuccess>
              <TransactionFields
                labels={labels}
                categories={categories}
                defaults={{ kind: "expense", amount: "", category: "groceries", label: "", date: defaultDate, deductible: false }}
              />
            </ActionForm>
          </Card>

          <section>
            <SectionTitle>{t("list.title")}</SectionTitle>
            {rows.length === 0 ? (
              <EmptyState title={t("list.empty")} text={t("list.emptyText")} />
            ) : (
              <>
                {/* Téléphone : cartes */}
                <ul className="flex flex-col gap-3 md:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cx("truncate font-semibold", !r.label && "text-muted")}>{r.label || t("list.noLabel")}</p>
                          <p className="mt-0.5 text-sm text-muted">
                            {catLabel(r.category)} · {formatDate(r.occurred_on, ctx.locale)}
                          </p>
                          {r.tax_deductible ? (
                            <div className="mt-1.5">
                              <Badge tone="accent">{t("list.deductible")}</Badge>
                            </div>
                          ) : null}
                        </div>
                        <p className={cx("tabular shrink-0 font-display font-bold", r.kind === "income" ? "text-good" : "text-ink")}>{amountText(r)}</p>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <Disclosure label={t("list.editTitle")}>{editForm(r)}</Disclosure>
                        <div className="flex justify-end">{deleteBtn(r.id)}</div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Ordinateur : tableau */}
                <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead>
                      <tr className="text-start text-muted">
                        <th scope="col" className="px-4 py-3 text-start font-semibold">{t("list.date")}</th>
                        <th scope="col" className="px-3 py-3 text-start font-semibold">{t("list.label")}</th>
                        <th scope="col" className="px-3 py-3 text-start font-semibold">{t("list.category")}</th>
                        <th scope="col" className="px-3 py-3 text-end font-semibold">{t("list.amount")}</th>
                        <th scope="col" className="px-4 py-3 text-end font-semibold">
                          <span className="sr-only">{t("list.actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <EditableRow
                          key={r.id}
                          colSpan={5}
                          editLabel={t("list.edit")}
                          closeLabel={tc("action.close")}
                          form={editForm(r)}
                          actions={deleteBtn(r.id)}
                          cells={
                            <>
                              <td className="tabular whitespace-nowrap px-4 py-2">{formatDate(r.occurred_on, ctx.locale)}</td>
                              <td className="max-w-[16rem] px-3 py-2">
                                <span className={cx("block truncate", !r.label && "text-muted")}>{r.label || t("list.noLabel")}</span>
                                {r.tax_deductible ? <Badge tone="accent">{t("list.deductible")}</Badge> : null}
                              </td>
                              <td className="px-3 py-2 text-muted">{catLabel(r.category)}</td>
                              <td className={cx("tabular whitespace-nowrap px-3 py-2 text-end font-semibold", r.kind === "income" ? "text-good" : "text-ink")}>
                                {amountText(r)}
                              </td>
                            </>
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <SectionTitle>{t("budgets.title")}</SectionTitle>
            <p className="-mt-2 mb-4 text-sm text-muted">{t("budgets.description")}</p>
            {budgetRows.length === 0 ? (
              <div className="mb-4 rounded-xl border border-dashed border-line px-4 py-5 text-center">
                <p className="font-semibold">{t("budgets.empty")}</p>
                <p className="mt-1 text-sm text-muted">{t("budgets.emptyText")}</p>
              </div>
            ) : (
              <ul className="mb-4 flex flex-col gap-4">
                {budgetRows.map((b) => {
                  const left = b.monthly_limit_cents - b.spent;
                  const pct = b.monthly_limit_cents > 0 ? Math.round((b.spent / b.monthly_limit_cents) * 100) : 0;
                  return (
                    <li key={b.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold">{catLabel(b.category)}</span>
                        <span className="tabular shrink-0 text-sm text-muted">
                          {t("budgets.spentOf", { spent: money(b.spent), limit: money(b.monthly_limit_cents) })}
                        </span>
                      </div>
                      <Progress value={b.spent} max={b.monthly_limit_cents} label={t("budgets.progressLabel", { category: catLabel(b.category), pct })} />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className={cx("tabular text-sm font-semibold", left < 0 ? "text-bad" : "text-good")}>
                          {left < 0 ? t("budgets.over", { amount: money(-left) }) : t("budgets.remaining", { amount: money(left) })}
                        </span>
                        <ConfirmButton
                          action={deleteBudget}
                          hidden={{ id: b.id }}
                          label={tc("action.delete")}
                          confirmLabel={tc("action.confirmDelete")}
                          cancelLabel={tc("action.cancel")}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Disclosure label={t("budgets.set")} defaultOpen={budgetRows.length === 0}>
              <ActionForm action={upsertBudget} submitLabel={t("budgets.save")} pendingLabel={tc("state.saving")} resetOnSuccess>
                <Field label={t("form.category")}>
                  <Select name="category" required defaultValue="groceries">
                    {categories.expense.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("budgets.limit")} hint={t("budgets.limitHint")}>
                  <Input name="monthly_limit" inputMode="decimal" required autoComplete="off" className="tabular" />
                </Field>
              </ActionForm>
            </Disclosure>
          </Card>

          <Card>
            <SectionTitle>{t("budgets.unbudgeted")}</SectionTitle>
            {unbudgeted.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Icon name="check" size={18} />
                {t("budgets.unbudgetedEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {unbudgeted.map(([c, v]) => (
                  <li key={c} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">{catLabel(c)}</span>
                    <span className="tabular shrink-0 font-semibold">{money(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
