import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getMessages, getT } from "@/lib/i18n/server";
import { usageThisMonth } from "@/lib/ai";
import { isUnlimited } from "@/lib/plans";
import { isConfigured } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, EmptyState, Notice, PageHeader, Progress, SectionTitle, ButtonLink } from "@/components/ui";
import { Disclaimer } from "./disclaimer";
import { EstimateForm } from "./estimate-form";
import { CA_PROVINCES, countryName, countryOptions } from "./countries";
import { moneyUnits, readResult, taxYears } from "./schema";

// L'estimation par l'IA peut prendre jusqu'à une minute.
export const maxDuration = 120;

export default async function FiscalPage() {
  const ctx = await requireContext();
  const [t, tc, messages] = await Promise.all([getT("fiscal"), getT("common"), getMessages("fiscal")]);

  const [used, { data: rows }] = await Promise.all([
    isConfigured.ai() && process.env.SUPABASE_SECRET_KEY ? usageThisMonth(ctx.user.id, "fiscal") : Promise.resolve(0),
    ctx.supabase
      .from("fiscal_estimates")
      .select("id, country, region, tax_year, result, created_at")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const limit = ctx.limits.fiscalPerMonth;
  const unlimited = isUnlimited(limit);
  const quotaReached = !unlimited && used >= limit;
  const years = taxYears();
  const month = new Date().getUTCMonth();
  const defaultYear = month < 4 ? years[1] : years[0];
  const provinces = CA_PROVINCES.map((code) => ({ code, name: t(`prov.${code}`) }));
  const regionLabel = (country: string, region: string) =>
    country === "CA" && (CA_PROVINCES as readonly string[]).includes(region) ? t(`prov.${region}`) : region;

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="flex flex-col gap-5">
        <Disclaimer t={t} />

        {!isConfigured.ai() ? <Notice tone="warn">{t("error.aiNotConfigured")}</Notice> : null}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{t("quota.title")}</p>
              <p className="tabular text-sm text-muted">
                {unlimited ? t("quota.unlimited", { used }) : t("quota.usage", { used, limit })}
              </p>
            </div>
            {ctx.plan === "free" || quotaReached ? (
              <ButtonLink href="/app/reglages/forfait" variant="secondary" size="sm">
                {tc("plan.upgrade")}
              </ButtonLink>
            ) : null}
          </div>
          {!unlimited ? (
            <div className="mt-3">
              <Progress value={used} max={limit} label={t("quota.title")} />
            </div>
          ) : null}
          {quotaReached ? (
            <div className="mt-3">
              <Notice tone="warn">{t("error.quota", { limit })}</Notice>
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>{t("form.title")}</SectionTitle>
          <EstimateForm
            messages={messages}
            countries={countryOptions(ctx.locale)}
            provinces={provinces}
            defaultCountry={ctx.profile.country}
            defaultRegion={ctx.profile.region}
            years={years}
            defaultYear={defaultYear}
            currency={ctx.currency}
            disabled={quotaReached}
          />
        </Card>

        <section>
          <SectionTitle>{t("history.title")}</SectionTitle>
          {rows && rows.length ? (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => {
                const res = readResult(r.result, ctx.currency);
                const place = [countryName(r.country, ctx.locale), regionLabel(r.country, r.region)].filter(Boolean).join(", ");
                return (
                  <li key={r.id}>
                    <Link
                      href={`/app/fiscalite/${r.id}`}
                      className="flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t("history.item", { place, year: r.tax_year })}</p>
                        <p className="text-sm text-muted">{formatDate(r.created_at, ctx.locale)}</p>
                      </div>
                      <span className="tabular font-bold">{moneyUnits(res.total_estimated, res.currency, ctx.locale, formatMoney)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={t("history.emptyTitle")} text={t("history.emptyText")} />
          )}
        </section>
      </div>
    </>
  );
}
