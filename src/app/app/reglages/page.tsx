import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { LOCALES } from "@/lib/i18n/locales";
import { formatDate } from "@/lib/format";
import { Badge, ButtonLink, Card, Field, Input, PageHeader, SectionTitle, Select } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { Icon, type IconName } from "@/components/icons";
import { CountryRegionFields } from "../fiscalite/country-fields";
import { CA_PROVINCES, countryOptions, currencyOptions } from "../fiscalite/countries";
import { saveProfile, saveTheme } from "./actions";

export default async function SettingsPage() {
  const ctx = await requireContext();
  const [t, tc, tf] = await Promise.all([getT("settings"), getT("common"), getT("fiscal")]);
  const p = ctx.profile;
  const provinces = CA_PROVINCES.map((code) => ({ code, name: tf(`prov.${code}`) }));
  const currencies = currencyOptions(ctx.locale);
  const b = ctx.billing;
  const renewal = b?.cancel_at_period_end ? "plan.endsOn" : b?.status === "trialing" ? "plan.trialEnds" : "plan.renewsOn";
  const renewalDate = b?.status === "trialing" ? b?.trial_end : b?.current_period_end;

  const links: { href: string; title: string; text: string; icon: IconName }[] = [
    { href: "/app/reglages/espaces", title: t("spaces.title"), text: t("spaces.subtitle"), icon: "users" },
    { href: "/app/reglages/donnees", title: t("data.title"), text: t("data.subtitle"), icon: "file" },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <SectionTitle>{t("profile.title")}</SectionTitle>
            <ActionForm action={saveProfile} submitLabel={tc("action.save")} pendingLabel={tc("state.saving")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("profile.fullName")}>
                  <Input name="full_name" defaultValue={p.full_name} maxLength={100} autoComplete="name" />
                </Field>
                <Field label={t("profile.email")} hint={t("profile.emailHint")}>
                  <Input value={ctx.user.email} readOnly disabled />
                </Field>
              </div>
              <Field label={tc("lang.label")} hint={tc("lang.aiNote")}>
                <Select name="locale" defaultValue={p.locale}>
                  {LOCALES.map((l) => (
                    <option key={l.code} value={l.code} lang={l.code}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <CountryRegionFields
                countries={countryOptions(ctx.locale)}
                provinces={provinces}
                defaultCountry={p.country}
                defaultRegion={p.region}
                labels={{
                  country: t("profile.country"),
                  other: tf("form.countryOther"),
                  otherPlaceholder: tf("form.countryOtherPlaceholder"),
                  region: t("profile.region"),
                  regionPlaceholder: tf("form.regionPlaceholder"),
                  regionHint: t("profile.regionHint"),
                }}
              />
              <Field label={t("profile.currency")} hint={t("profile.currencyHint")}>
                <Input
                  name="currency"
                  defaultValue={p.currency}
                  list="kb-currencies"
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  autoCapitalize="characters"
                  autoComplete="off"
                  required
                  className="uppercase sm:max-w-48"
                />
                <datalist id="kb-currencies">
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
              </Field>
              <label className="flex min-h-10 cursor-pointer items-start gap-3">
                <input type="checkbox" name="email_reminders" defaultChecked={p.email_reminders} className="mt-1 size-5 accent-accent" />
                <span className="min-w-0">
                  <span className="block font-semibold">{t("profile.reminders")}</span>
                  <span className="block text-sm text-muted">{t("profile.remindersHint")}</span>
                </span>
              </label>
            </ActionForm>
          </Card>

          <Card>
            <SectionTitle>{tc("theme.label")}</SectionTitle>
            <ActionForm action={saveTheme} submitLabel={tc("action.save")} pendingLabel={tc("state.saving")}>
              <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <legend className="sr-only">{tc("theme.label")}</legend>
                {(["system", "light", "dark"] as const).map((th) => (
                  <label
                    key={th}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 has-[:checked]:border-accent has-[:checked]:bg-soft"
                  >
                    <input type="radio" name="theme" value={th} defaultChecked={p.theme === th} className="size-4 accent-accent" />
                    <span className="font-semibold">{tc(`theme.${th}`)}</span>
                  </label>
                ))}
              </fieldset>
            </ActionForm>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <SectionTitle>{t("plan.title")}</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-bold">{tc(`plan.${ctx.plan}`)}</p>
              {b?.status === "trialing" ? <Badge tone="accent">{t("plan.trial")}</Badge> : null}
              {b?.status === "past_due" ? <Badge tone="warn">{t("plan.pastDue")}</Badge> : null}
            </div>
            {ctx.plan !== "free" && renewalDate ? (
              <p className="mt-1 text-sm text-muted">{t(renewal, { date: formatDate(renewalDate, ctx.locale) })}</p>
            ) : null}
            <ButtonLink href="/app/reglages/forfait" variant={ctx.plan === "free" ? "primary" : "secondary"} className="mt-4 w-full">
              {t("plan.manage")}
            </ButtonLink>
          </Card>

          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
              <Icon name={l.icon} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-sm text-muted">{l.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
