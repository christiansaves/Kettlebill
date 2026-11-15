"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type Stripe from "stripe";
import { requireContext, type AppContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfigured, publicEnv } from "@/lib/env";
import { stripePriceId, TRIAL_DAYS } from "@/lib/plans";
import type { ActionResult } from "@/lib/types";
import { stripeLocale } from "./stripe-locale";

const checkoutSchema = z.object({
  plan: z.enum(["free", "individual", "family"]),
  interval: z.enum(["month", "year"]),
});

/** Statuts Stripe pour lesquels un abonnement existe encore (à modifier dans le portail plutôt qu'à recréer). */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

const pageUrl = () => `${publicEnv.siteUrl()}/app/reglages/forfait`;

/**
 * Retourne l'identifiant du client Stripe de l'utilisateur, en le créant au besoin.
 * La table billing n'est modifiable que par le serveur : on écrit avec le client « service ».
 */
async function getOrCreateCustomer(ctx: AppContext, stripe: Stripe): Promise<string> {
  const existing = ctx.billing?.stripe_customer_id;
  if (existing) {
    try {
      const c = await stripe.customers.retrieve(existing);
      if (!("deleted" in c && c.deleted)) return existing;
    } catch (e) {
      // Client supprimé ou créé dans un autre mode (test/production) : on en crée un nouveau.
      if (!(e instanceof Error && "code" in e && (e as { code?: string }).code === "resource_missing")) throw e;
    }
  }

  const customer = await stripe.customers.create(
    {
      email: ctx.user.email || undefined,
      name: ctx.profile.full_name || undefined,
      preferred_locales: [stripeLocale(ctx.locale, ctx.profile.country)].filter((l) => l !== "auto"),
      metadata: { user_id: ctx.user.id },
    },
    // Évite les doublons en cas de double clic.
    { idempotencyKey: `kb-customer-${ctx.user.id}-${existing ?? "new"}` },
  );

  const admin = createAdminClient();
  const { error } = await admin
    .from("billing")
    .upsert(
      { user_id: ctx.user.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`billing upsert: ${error.message}`);
  return customer.id;
}

/** Démarre un paiement Stripe Checkout pour un forfait payant (ou ouvre le portail si un abonnement existe déjà). */
export async function startCheckout(plan: unknown, interval: unknown): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("billing");

  const parsed = checkoutSchema.safeParse({ plan, interval });
  if (!parsed.success) return { ok: false, error: t("error.invalid") };
  const choice = parsed.data;
  if (choice.plan === "free") return { ok: false, error: t("error.free") };
  if (!isConfigured.stripe() || !process.env.SUPABASE_SECRET_KEY) return { ok: false, error: t("error.stripeOff") };

  const price = stripePriceId(choice.plan, choice.interval);
  if (!price) return { ok: false, error: t("error.notConfigured") };

  let url: string | null = null;
  try {
    const stripe = getStripe();
    const customer = await getOrCreateCustomer(ctx, stripe);

    // Un abonnement existe déjà (même si le webhook n'est pas encore passé) : changement de forfait dans le portail.
    const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
    if (subs.data.some((s) => LIVE_STATUSES.has(s.status))) {
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: pageUrl(),
        locale: stripeLocale(ctx.locale, ctx.profile.country, "portal") as Stripe.BillingPortal.SessionCreateParams.Locale,
      });
      url = portal.url;
    } else {
      // L'essai gratuit n'est offert qu'à qui n'a jamais été abonné.
      const neverSubscribed = !ctx.billing?.stripe_subscription_id && subs.data.length === 0;
      const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === "true";

      const params: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        customer,
        client_reference_id: ctx.user.id,
        metadata: { user_id: ctx.user.id },
        subscription_data: {
          metadata: { user_id: ctx.user.id },
          ...(neverSubscribed ? { trial_period_days: TRIAL_DAYS } : {}),
        },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        automatic_tax: { enabled: automaticTax },
        ...(automaticTax ? { customer_update: { address: "auto" as const } } : {}),
        locale: stripeLocale(ctx.locale, ctx.profile.country) as Stripe.Checkout.SessionCreateParams.Locale,
        success_url: `${pageUrl()}?statut=succes`,
        cancel_url: `${pageUrl()}?statut=annule`,
      };
      const session = await stripe.checkout.sessions.create(params);
      url = session.url;
    }
  } catch (e) {
    console.error("[billing] startCheckout", e);
    return { ok: false, error: t("error.stripe") };
  }

  if (!url) return { ok: false, error: t("error.stripe") };
  redirect(url); // hors du try : redirect() lève une exception spéciale
}

/** Ouvre le portail client Stripe (factures, moyen de paiement, changement de forfait, annulation). */
export async function openPortal(): Promise<ActionResult> {
  const ctx = await requireContext();
  const t = await getT("billing");
  if (!isConfigured.stripe()) return { ok: false, error: t("error.stripeOff") };

  const customer = ctx.billing?.stripe_customer_id;
  if (!customer) return { ok: false, error: t("error.noCustomer") };

  let url: string;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: pageUrl(),
      locale: stripeLocale(ctx.locale, ctx.profile.country, "portal") as Stripe.BillingPortal.SessionCreateParams.Locale,
    });
    url = portal.url;
  } catch (e) {
    console.error("[billing] openPortal", e);
    return { ok: false, error: t("error.stripe") };
  }
  redirect(url);
}
