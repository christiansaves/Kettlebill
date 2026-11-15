import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, spaceOwnerPlan } from "@/lib/session";
import { getMessages, getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { isConfigured } from "@/lib/env";
import { isUnlimited, limitsFor, PLANS, TRIAL_DAYS, type PlanId, type PlanLimits } from "@/lib/plans";
import { usageThisMonth } from "@/lib/ai";
import { formatDate, intlLocale } from "@/lib/format";
import { Badge, ButtonLink, Card, Notice, PageHeader, Progress, SectionTitle } from "@/components/ui";
import { PortalButton } from "./billing-buttons";
import { PlanPicker, type PlanCardData } from "./plan-picker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("billing");
  return { title: t("title") };
}

/** Statuts Stripe d'un abonnement qui existe encore. */
const LIVE = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

function formatCad(amount: number, locale: string) {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(whole ? 0 : 2)} $`;
  }
}

function countKey(t: T, base: string, n: number, opts: { none?: boolean } = {}) {
  if (isUnlimited(n)) return t(`${base}.unlimited`);
  if (n === 0 && opts.none) return t(`${base}.none`);
  return t(n === 1 ? `${base}.one` : `${base}.other`, { n });
}

function featuresFor(t: T, l: PlanLimits): string[] {
  const out = [
    countKey(t, "feature.deadlines", l.deadlines),
    countKey(t, "feature.documents", l.documents),
    countKey(t, "feature.letters", l.lettersPerMonth),
    countKey(t, "feature.fiscal", l.fiscalPerMonth),
    countKey(t, "feature.aiLetters", l.aiLettersPerMonth, { none: true }),
    countKey(t, "feature.spaces", l.spaces, { none: true }),
    t(l.membersPerSpace > 1 ? "feature.members.other" : "feature.members.one", { n: l.membersPerSpace }),
  ];
  if (l.emailReminders) out.push(t("feature.reminders"));
  return out;
}

function Meter({ label, used, max, t, locale }: { label: string; used: number; max: number; t: T; locale: string }) {
  const nf = new Intl.NumberFormat(locale);
  const unlimited = isUnlimited(max);
  const notIncluded = !unlimited && max === 0;
  const value = unlimited
    ? t("usage.usedUnlimited", { used: nf.format(used) })
    : notIncluded
      ? t("usage.notIncluded")
      : t("usage.of", { used: nf.format(used), max: nf.format(max) });
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-sm font-semibold">{label}</span>
        <span className={notIncluded ? "text-sm text-muted" : "tabular text-sm text-muted"}>{value}</span>
      </div>
      {unlimited || notIncluded ? null : <Progress value={used} max={max} label={label} />}
    </div>
  );
}

export default async function ForfaitPage({ searchParams }: PageProps<"/app/reglages/forfait">) {
  const ctx = await requireContext();
  const [t, tc, messages, sp] = await Promise.all([getT("billing"), getT("common"), getMessages("billing"), searchParams]);
  const locale = intlLocale(ctx.locale, ctx.profile.country);
  const statut = typeof sp.statut === "string" ? sp.statut : undefined;
  const stripeReady = isConfigured.stripe();
  // Dans les apps iPhone/Android, Apple et Google exigent leur propre système de paiement :
  // on n'y affiche donc pas l'achat par Stripe (voir mobile/STORES.md).
  const inNativeApp = /KettlebillApp-(iOS|Android)/.test((await headers()).get("user-agent") ?? "");
  const billing = ctx.billing;

  // --- Utilisation -------------------------------------------------------------------------------
  const spaceLimits = limitsFor(await spaceOwnerPlan(ctx));
  const isOwner = ctx.space.owner_id === ctx.user.id;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [deadlinesRes, documentsRes, lettersRes] = await Promise.all([
    ctx.supabase.from("deadlines").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("done", false),
    ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id),
    ctx.supabase
      .from("letters")
      .select("id", { count: "exact", head: true })
      .eq("space_id", ctx.space.id)
      .gte("created_at", monthStart.toISOString()),
  ]);

  // Les compteurs IA passent par le client « service » : on les masque si la clé n'est pas configurée.
  let ai: { fiscal: number; letters: number } | null = null;
  if (process.env.SUPABASE_SECRET_KEY) {
    try {
      const [fiscal, letters] = await Promise.all([usageThisMonth(ctx.user.id, "fiscal"), usageThisMonth(ctx.user.id, "letter")]);
      ai = { fiscal, letters };
    } catch (e) {
      console.error("[billing] usageThisMonth", e);
    }
  }
  const extraSpaces = ctx.spaces.filter((s) => s.owner_id === ctx.user.id && s.kind !== "personal").length;

  // --- Abonnement courant ------------------------------------------------------------------------
  const status = billing?.stripe_subscription_id ? billing.status : null;
  const live = status ? LIVE.has(status) : false;
  const shownPlan: PlanId = live && billing && billing.plan !== "free" ? billing.plan : ctx.plan;
  const date = (iso: string | null | undefined) => formatDate(iso, locale, { day: "numeric", month: "long", year: "numeric" });
  const statusTone =
    status === "active" ? "good" : status === "trialing" ? "accent" : status === "unpaid" ? "bad" : status === "past_due" || status === "incomplete" ? "warn" : "neutral";
  const statusLabel = status
    ? status === "trialing" && billing?.trial_end
      ? t("status.trialing", { date: date(billing.trial_end) })
      : status === "trialing"
        ? t("status.trialingShort")
        : messages[`status.${status}`]
          ? t(`status.${status}`)
          : status
    : null;
  const hasCustomer = Boolean(billing?.stripe_customer_id);

  // --- Cartes des forfaits -----------------------------------------------------------------------
  const plans: PlanCardData[] = (Object.keys(PLANS) as PlanId[]).map((id) => {
    const p = PLANS[id];
    return {
      id,
      name: tc(`plan.${id}`),
      description: t(`planDesc.${id}`),
      features: featuresFor(t, p.limits),
      price: {
        month: { amount: formatCad(p.priceCad.month, locale) },
        year: {
          amount: formatCad(p.priceCad.year, locale),
          equivalent: p.priceCad.year ? formatCad(Math.round((p.priceCad.year / 12) * 100) / 100, locale) : undefined,
        },
      },
    };
  });
  const monthsFree = Math.min(
    ...(["individual", "family"] as const).map((id) => Math.round(12 - PLANS[id].priceCad.year / PLANS[id].priceCad.month)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonLink href="/app/reglages" variant="ghost" size="sm">
            {tc("action.back")}
          </ButtonLink>
        }
      />

      {statut === "succes" ? (
        <Notice tone="good">
          <span>{t("notice.success")}</span>{" "}
          <Link href="/app/reglages/forfait" className="font-semibold underline">
            {t("notice.refresh")}
          </Link>
        </Notice>
      ) : statut === "annule" ? (
        <Notice tone="neutral">{t("notice.canceled")}</Notice>
      ) : null}
      {!stripeReady ? <Notice tone="warn">{t("notice.stripeOff")}</Notice> : null}

      {/* Forfait actuel */}
      <Card>
        <SectionTitle>{t("current.title")}</SectionTitle>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-2xl font-bold">{tc(`plan.${shownPlan}`)}</p>
            {statusLabel ? <Badge tone={statusTone}>{statusLabel}</Badge> : null}
            {live && billing?.billing_interval ? <Badge>{t(`interval.${billing.billing_interval}`)}</Badge> : null}
          </div>

          {!status ? <p className="text-muted">{t("current.freeText")}</p> : null}

          {live && billing?.current_period_end && !billing.cancel_at_period_end && status !== "trialing" && (status === "active" || status === "past_due") ? (
            <p className="text-sm text-muted">{t("current.renews", { date: date(billing.current_period_end) })}</p>
          ) : null}
          {status === "trialing" && billing?.trial_end && !billing.cancel_at_period_end ? (
            <Notice tone="accent">{t("current.trialEnds", { date: date(billing.trial_end) })}</Notice>
          ) : null}
          {live && billing?.cancel_at_period_end && billing.current_period_end ? (
            <Notice tone="warn">{t("current.endsOn", { date: date(billing.current_period_end) })}</Notice>
          ) : null}
          {status === "past_due" ? <Notice tone="warn">{t("current.pastDue")}</Notice> : null}
          {status === "unpaid" ? <Notice tone="bad">{t("current.unpaid")}</Notice> : null}
          {status === "incomplete" ? <Notice tone="warn">{t("current.incomplete")}</Notice> : null}
          {status === "paused" ? <Notice tone="neutral">{t("current.paused")}</Notice> : null}
          {status === "canceled" || status === "incomplete_expired" ? <Notice tone="neutral">{t("current.canceled")}</Notice> : null}

          {hasCustomer && stripeReady && !inNativeApp ? (
            <div className="flex flex-col gap-1.5">
              <PortalButton
                label={status === "past_due" || status === "unpaid" || status === "incomplete" ? t("portal.updatePayment") : t("portal.button")}
                pendingLabel={t("portal.pending")}
                variant={status === "past_due" || status === "unpaid" || status === "incomplete" ? "primary" : "secondary"}
              />
              <p className="text-xs text-muted">{t("portal.hint")}</p>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Utilisation */}
      <Card>
        <SectionTitle>{t("usage.title")}</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          {t("usage.spaceHint", { space: ctx.space.kind === "personal" ? tc("space.personal") : ctx.space.name })}
          {!isOwner ? ` ${t("usage.sharedHint")}` : ""}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Meter t={t} locale={locale} label={t("usage.deadlines")} used={deadlinesRes.count ?? 0} max={spaceLimits.deadlines} />
          <Meter t={t} locale={locale} label={t("usage.documents")} used={documentsRes.count ?? 0} max={spaceLimits.documents} />
          <Meter t={t} locale={locale} label={t("usage.letters")} used={lettersRes.count ?? 0} max={spaceLimits.lettersPerMonth} />
          {ai ? (
            <>
              <Meter t={t} locale={locale} label={t("usage.fiscal")} used={ai.fiscal} max={ctx.limits.fiscalPerMonth} />
              <Meter t={t} locale={locale} label={t("usage.aiLetters")} used={ai.letters} max={ctx.limits.aiLettersPerMonth} />
            </>
          ) : null}
          <Meter t={t} locale={locale} label={t("usage.spaces")} used={extraSpaces} max={ctx.limits.spaces} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {ai ? t("usage.resetNote") : `${t("usage.aiUnavailable")} ${t("usage.resetNote")}`}
        </p>
      </Card>

      {/* Forfaits */}
      <section>
        <SectionTitle>{t("plans.title")}</SectionTitle>
        {live && shownPlan !== "free" ? <p className="mb-3 text-sm text-muted">{t("plans.switchNote")}</p> : null}
        {inNativeApp ? (
          <Notice tone="accent">{t("plans.nativeAppNote")}</Notice>
        ) : (
        <PlanPicker
          messages={messages}
          plans={plans}
          currentPlan={ctx.plan}
          currentInterval={ctx.plan !== "free" ? (billing?.billing_interval ?? null) : null}
          hasSubscription={live}
          hasCustomer={hasCustomer}
          trialEligible={!billing?.stripe_subscription_id}
          trialDays={TRIAL_DAYS}
          monthsFree={monthsFree}
          stripeReady={stripeReady}
        />
        )}
        <p className="mt-4 text-center text-xs text-muted">{t("plans.secure")}</p>
      </section>
    </div>
  );
}
