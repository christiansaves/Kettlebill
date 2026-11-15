"use client";
// Cartes des forfaits avec bascule mensuel / annuel.
import { useState, type ReactNode } from "react";
import { Badge, buttonClass, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { makeT, type Messages } from "@/lib/i18n/shared";
import { CheckoutButton, PortalButton } from "./billing-buttons";

type Interval = "month" | "year";
type PlanKey = "free" | "individual" | "family";

export interface PlanCardData {
  id: PlanKey;
  name: string;
  description: string;
  features: string[];
  /** Prix déjà formatés (ex. « 6,00 $ ») ; equivalent = prix mensuel moyen en annuel. */
  price: Record<Interval, { amount: string; equivalent?: string }>;
}

export function PlanPicker({
  messages,
  plans,
  currentPlan,
  currentInterval,
  hasSubscription,
  hasCustomer,
  trialEligible,
  trialDays,
  monthsFree,
  stripeReady,
}: {
  messages: Messages;
  plans: PlanCardData[];
  currentPlan: PlanKey;
  currentInterval: Interval | null;
  hasSubscription: boolean;
  hasCustomer: boolean;
  trialEligible: boolean;
  trialDays: number;
  monthsFree: number;
  stripeReady: boolean;
}) {
  const t = makeT(messages);
  const [interval, setBillingInterval] = useState<Interval>(currentInterval ?? "month");

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("plans.intervalLabel")} className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
          {(["month", "year"] as const).map((iv) => (
            <button
              key={iv}
              type="button"
              aria-pressed={interval === iv}
              onClick={() => setBillingInterval(iv)}
              className={cx(
                "h-10 rounded-lg px-4 text-sm font-semibold transition",
                interval === iv ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {iv === "month" ? t("plans.monthly") : t("plans.yearly")}
            </button>
          ))}
        </div>
        {monthsFree > 0 ? <Badge tone="good">{t("plans.monthsFree", { n: monthsFree })}</Badge> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isFree = p.id === "free";
          const isCurrent = p.id === currentPlan && (isFree || !currentInterval || currentInterval === interval);
          const popular = p.id === "individual";
          const price = p.price[interval];

          let cta: ReactNode;
          if (isCurrent) {
            cta = (
              <button type="button" disabled className={buttonClass("secondary", "md", "w-full")}>
                {t("plans.current")}
              </button>
            );
          } else if (isFree) {
            cta =
              hasCustomer && stripeReady ? (
                <PortalButton label={t("plans.downgrade")} pendingLabel={t("portal.pending")} variant="ghost" full />
              ) : null;
          } else if (!stripeReady) {
            cta = (
              <button type="button" disabled className={buttonClass("primary", "md", "w-full")}>
                {t("plans.choose")}
              </button>
            );
          } else {
            cta = (
              <CheckoutButton
                plan={p.id as "individual" | "family"}
                interval={interval}
                label={hasSubscription ? t("plans.change") : t("plans.choose")}
                pendingLabel={t("plans.pending")}
                variant={popular ? "primary" : "secondary"}
              />
            );
          }

          return (
            <section
              key={p.id}
              className={cx(
                "flex min-w-0 flex-col gap-4 rounded-2xl border bg-surface p-4 sm:p-5",
                popular ? "border-accent" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                {isCurrent ? (
                  <Badge tone="accent">{t("plans.current")}</Badge>
                ) : popular ? (
                  <Badge tone="accent">{t("plans.popular")}</Badge>
                ) : null}
              </div>
              <p className="-mt-2 text-sm text-muted">{p.description}</p>

              <div>
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="tabular font-display text-3xl font-bold">{price.amount}</span>
                  <span className="text-sm text-muted">
                    {isFree ? t("plans.forever") : interval === "month" ? t("plans.perMonth") : t("plans.perYear")}
                  </span>
                </p>
                {!isFree ? (
                  <p className="mt-1 text-xs text-muted">
                    {price.equivalent && interval === "year" ? `${t("plans.equivalent", { price: price.equivalent })} · ` : ""}
                    {t("plans.taxes")}
                  </p>
                ) : null}
                {!isFree && trialEligible && !hasSubscription ? (
                  <p className="mt-2 text-sm font-semibold text-good">{t("plans.trial", { days: trialDays })}</p>
                ) : null}
              </div>

              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="check" size={18} className="mt-px shrink-0 text-good" aria-hidden="true" />
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>

              {cta ? <div className="mt-auto">{cta}</div> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
