import { notFound } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { ButtonLink, Card, PageHeader, SectionTitle } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { Disclaimer } from "../disclaimer";
import { ResultView } from "../result-view";
import { deleteEstimate } from "../actions";
import { CA_PROVINCES, countryName } from "../countries";
import { HOUSEHOLDS, readInput, readResult } from "../schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EstimatePage({ params }: PageProps<"/app/fiscalite/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("fiscal"), getT("common")]);

  const { data: est } = await ctx.supabase
    .from("fiscal_estimates")
    .select("*")
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .maybeSingle();
  if (!est) notFound();

  const result = readResult(est.result, ctx.currency);
  const input = readInput(est.input);
  const inputCurrency = /^[A-Z]{3}$/.test(input.currency) ? input.currency : ctx.currency;

  const { data: existing } = await ctx.supabase
    .from("deadlines")
    .select("title, due_on")
    .eq("space_id", ctx.space.id)
    .eq("kind", "tax")
    .gte("due_on", `${est.tax_year}-01-01`);
  const addedKeys = new Set((existing ?? []).map((d) => `${d.title}|${d.due_on}`));

  const region =
    est.country === "CA" && (CA_PROVINCES as readonly string[]).includes(est.region) ? t(`prov.${est.region}`) : est.region;
  const place = [countryName(est.country, ctx.locale), region].filter(Boolean).join(", ");
  const m = (c: number) => formatMoney(c, inputCurrency, ctx.locale);
  const household = (HOUSEHOLDS as readonly string[]).includes(input.household) ? t(`household.${input.household}`) : input.household;

  return (
    <>
      <PageHeader
        title={t("history.item", { place, year: est.tax_year })}
        description={t("detail.createdOn", { date: formatDate(est.created_at, ctx.locale) })}
        actions={
          <ButtonLink href="/app/fiscalite" variant="secondary">
            {tc("action.back")}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-5">
        <Disclaimer t={t} />
        <ResultView result={result} estimateId={est.id} locale={ctx.locale} addedKeys={addedKeys} t={t} />

        <Card>
          <SectionTitle>{t("detail.inputs")}</SectionTitle>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Item label={t("form.household")} value={household} />
            <Item label={t("form.dependents")} value={String(input.dependents)} />
            <Item label={t("form.employment", { currency: inputCurrency })} value={m(input.employment_cents)} />
            <Item label={t("form.self_employment", { currency: inputCurrency })} value={m(input.self_employment_cents)} />
            <Item label={t("form.other_income", { currency: inputCurrency })} value={m(input.other_income_cents)} />
            <Item label={t("form.deductible", { currency: inputCurrency })} value={m(input.deductible_cents)} />
            <Item label={t("form.retirement", { currency: inputCurrency })} value={m(input.retirement_cents)} />
            <Item label={t("form.sales", { currency: inputCurrency })} value={m(input.sales_cents)} />
          </dl>
          {input.notes ? (
            <div className="mt-4">
              <p className="text-sm text-muted">{t("form.notes")}</p>
              <p className="mt-1 whitespace-pre-line">{input.notes}</p>
            </div>
          ) : null}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{tc("footer.disclaimer")}</p>
          <ConfirmButton
            action={deleteEstimate}
            hidden={{ id: est.id }}
            label={t("detail.delete")}
            confirmLabel={tc("action.confirmDelete")}
            cancelLabel={tc("action.cancel")}
          />
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}
