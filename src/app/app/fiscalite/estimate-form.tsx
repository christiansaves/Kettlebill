"use client";
import { useActionState, useState, useTransition } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/forms";
import { makeT, type Messages } from "@/lib/i18n/shared";
import { CountryRegionFields } from "./country-fields";
import type { Option } from "./countries";
import { HOUSEHOLDS } from "./schema";
import { prefillFromBudget, runEstimate } from "./actions";

type AmountKey = "employment" | "self_employment" | "other_income" | "deductible" | "retirement" | "sales";
const AMOUNTS: AmountKey[] = ["employment", "self_employment", "other_income", "deductible", "retirement", "sales"];

export function EstimateForm({
  messages,
  countries,
  provinces,
  defaultCountry,
  defaultRegion,
  years,
  defaultYear,
  currency,
  disabled,
}: {
  messages: Messages;
  countries: Option[];
  provinces: Option[];
  defaultCountry: string;
  defaultRegion: string;
  years: number[];
  defaultYear: number;
  currency: string;
  disabled: boolean;
}) {
  const t = makeT(messages);
  const [state, formAction] = useActionState(runEstimate, null);
  const [year, setYear] = useState(defaultYear);
  const [values, setValues] = useState<Record<AmountKey, string>>({
    employment: "",
    self_employment: "",
    other_income: "",
    deductible: "",
    retirement: "",
    sales: "",
  });
  const [prefillMsg, setPrefillMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [prefilling, startPrefill] = useTransition();

  const toUnits = (c: number) => (c > 0 ? (c / 100).toFixed(2) : "");

  function prefill() {
    startPrefill(async () => {
      const r = await prefillFromBudget(year);
      if (!r) {
        setPrefillMsg({ ok: false, text: t("prefill.error") });
        return;
      }
      if (r.count === 0) {
        setPrefillMsg({ ok: false, text: t("prefill.none", { year }) });
        return;
      }
      setValues((v) => ({
        ...v,
        employment: toUnits(r.employment),
        self_employment: toUnits(r.selfEmployment),
        other_income: toUnits(r.other),
        deductible: toUnits(r.deductible),
      }));
      setPrefillMsg({ ok: true, text: t("prefill.done", { n: r.count, year }) });
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CountryRegionFields
        countries={countries}
        provinces={provinces}
        defaultCountry={defaultCountry}
        defaultRegion={defaultRegion}
        labels={{
          country: t("form.country"),
          other: t("form.countryOther"),
          otherPlaceholder: t("form.countryOtherPlaceholder"),
          region: t("form.region"),
          regionPlaceholder: t("form.regionPlaceholder"),
          regionHint: t("form.regionHint"),
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("form.year")}>
          <Select name="tax_year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("form.household")}>
          <Select name="household" defaultValue="single">
            {HOUSEHOLDS.map((h) => (
              <option key={h} value={h}>
                {t(`household.${h}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("form.dependents")}>
          <Input name="dependents" type="number" inputMode="numeric" min={0} max={20} step={1} defaultValue={0} />
        </Field>
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{t("prefill.title")}</p>
            <p className="text-sm text-muted">{t("prefill.text")}</p>
          </div>
          <Button type="button" variant="secondary" onClick={prefill} disabled={prefilling}>
            {prefilling ? t("prefill.loading") : t("prefill.button")}
          </Button>
        </div>
        {prefillMsg ? (
          <p className={prefillMsg.ok ? "mt-2 text-sm font-semibold text-good" : "mt-2 text-sm font-semibold text-warn"} role="status">
            {prefillMsg.text}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {AMOUNTS.map((k) => (
          <Field key={k} label={t(`form.${k}`, { currency })} hint={t(`form.${k}Hint`)}>
            <Input
              name={k}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              className="tabular"
              value={values[k]}
              onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <Field label={t("form.notes")} hint={t("form.notesHint")}>
        <Textarea name="notes" maxLength={2000} placeholder={t("form.notesPlaceholder")} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        {disabled ? (
          <Button type="button" disabled>
            {t("form.submit")}
          </Button>
        ) : (
          <SubmitButton pendingLabel={t("form.pending")}>{t("form.submit")}</SubmitButton>
        )}
        <FormMessage state={state} />
      </div>
      <p className="text-xs text-muted">{t("form.privacy")}</p>
    </form>
  );
}
