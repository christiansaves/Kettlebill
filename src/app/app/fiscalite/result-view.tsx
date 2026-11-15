import { Badge, Card, SectionTitle, Stat } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { formatDate, formatMoney } from "@/lib/format";
import type { T } from "@/lib/i18n/shared";
import { addTaxDeadline } from "./actions";
import { isIsoDate, moneyUnits, type FiscalResult } from "./schema";

const CONFIDENCE_TONE = { low: "warn", medium: "accent", high: "good" } as const;

export function ResultView({
  result,
  estimateId,
  locale,
  addedKeys,
  t,
}: {
  result: FiscalResult;
  estimateId: string;
  locale: string;
  /** Clés « titre|date » des échéances déjà présentes dans l'espace. */
  addedKeys: Set<string>;
  t: T;
}) {
  const money = (v: number | null) => moneyUnits(v, result.currency, locale, formatMoney);
  const pct = (v: number | null) =>
    v == null ? "—" : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v)} %`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={CONFIDENCE_TONE[result.confidence]}>{t(`confidence.${result.confidence}`)}</Badge>
        <span className="text-sm text-muted">{t("result.currency", { currency: result.currency })}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("result.total")} value={money(result.total_estimated)} hint={t("result.approx")} />
        <Stat label={t("result.effectiveRate")} value={pct(result.effective_rate_percent)} />
        <Stat label={t("result.incomeTax")} value={money(result.income_tax.total)} />
        <Stat label={t("result.social")} value={money(result.social_contributions.total)} />
      </div>

      {result.summary ? (
        <Card>
          <SectionTitle>{t("result.summary")}</SectionTitle>
          <p className="whitespace-pre-line">{result.summary}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t("result.incomeTax")}</SectionTitle>
          <dl className="flex flex-col divide-y divide-line">
            <Row label={t("result.national")} value={money(result.income_tax.federal_or_national)} />
            <Row label={t("result.regional")} value={money(result.income_tax.regional)} />
            <Row label={t("result.totalIncomeTax")} value={money(result.income_tax.total)} strong />
          </dl>
          {result.income_tax.notes ? <p className="mt-3 text-sm text-muted whitespace-pre-line">{result.income_tax.notes}</p> : null}
        </Card>

        <Card>
          <SectionTitle>{t("result.social")}</SectionTitle>
          {result.social_contributions.details.length ? (
            <dl className="flex flex-col divide-y divide-line">
              {result.social_contributions.details.map((d, i) => (
                <Row key={i} label={d.name} value={money(d.amount)} />
              ))}
              <Row label={t("result.totalSocial")} value={money(result.social_contributions.total)} strong />
            </dl>
          ) : (
            <p className="text-muted">{t("result.none")}</p>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle action={<Badge tone={result.sales_tax.applies ? "accent" : "neutral"}>{result.sales_tax.applies ? t("result.salesApplies") : t("result.salesNotApplies")}</Badge>}>
          {t("result.salesTax")}
        </SectionTitle>
        {result.sales_tax.explanation ? <p className="whitespace-pre-line">{result.sales_tax.explanation}</p> : null}
        <dl className="mt-3 flex flex-col divide-y divide-line">
          <Row label={t("result.threshold")} value={money(result.sales_tax.registration_threshold)} />
          <Row label={t("result.toRemit")} value={money(result.sales_tax.amount_to_remit)} strong />
        </dl>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t("result.credits")}</SectionTitle>
          {result.credits.length ? (
            <ul className="flex flex-col gap-4">
              {result.credits.map((c, i) => (
                <li key={i} className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{c.name}</p>
                    {c.estimated_value != null ? <span className="tabular font-semibold text-good">{money(c.estimated_value)}</span> : null}
                  </div>
                  {c.description ? <p className="mt-1 text-sm">{c.description}</p> : null}
                  {c.how_to_claim ? (
                    <p className="mt-1 text-sm text-muted">
                      <span className="font-semibold">{t("result.howToClaim")} </span>
                      {c.how_to_claim}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("result.none")}</p>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("result.deductions")}</SectionTitle>
          {result.deductions_to_consider.length ? (
            <ul className="flex flex-col gap-4">
              {result.deductions_to_consider.map((d, i) => (
                <li key={i}>
                  <p className="font-semibold">{d.name}</p>
                  {d.description ? <p className="mt-1 text-sm">{d.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("result.none")}</p>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>{t("result.deadlines")}</SectionTitle>
        {result.key_deadlines.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {result.key_deadlines.map((d, i) => {
              const valid = isIsoDate(d.date);
              const title = (d.label || t("deadline.defaultTitle")).slice(0, 200);
              const added = addedKeys.has(`${title}|${d.date}`);
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{d.label}</p>
                    <p className="tabular text-sm text-muted">{valid ? formatDate(d.date, locale, { dateStyle: "long" }) : d.date}</p>
                  </div>
                  {!valid ? null : added ? (
                    <Badge tone="good">{t("deadline.inDeadlines")}</Badge>
                  ) : (
                    <ActionForm action={addTaxDeadline} submitLabel={t("deadline.add")} submitVariant="secondary" className="gap-0">
                      <input type="hidden" name="estimate_id" value={estimateId} />
                      <input type="hidden" name="index" value={i} />
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">{t("result.none")}</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t("result.assumptions")}</SectionTitle>
          {result.assumptions.length ? (
            <ul className="list-disc space-y-1.5 ps-5">
              {result.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("result.none")}</p>
          )}
        </Card>
        <Card className={result.warnings.length ? "border-transparent bg-warn-bg text-warn" : ""}>
          <SectionTitle>{t("result.warnings")}</SectionTitle>
          {result.warnings.length ? (
            <ul className="list-disc space-y-1.5 ps-5">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("result.none")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={strong ? "tabular font-bold" : "tabular"}>{value}</dd>
    </div>
  );
}
