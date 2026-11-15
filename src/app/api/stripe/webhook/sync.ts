import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planFromPriceId, type PlanId } from "@/lib/plans";

/** Statuts où l'abonnement est terminé pour de bon : retour au forfait gratuit. */
const ENDED = new Set(["canceled", "incomplete_expired"]);

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/** Retrouve l'utilisateur Kettlebill d'un abonnement : indice explicite > metadata.user_id > client Stripe connu. */
async function resolveUserId(admin: SupabaseClient, sub: Stripe.Subscription, hint?: string | null): Promise<string | null> {
  if (hint) return hint;
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;
  const customerId = idOf(sub.customer);
  if (!customerId) return null;
  const { data, error } = await admin.from("billing").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw new Error(`billing lookup: ${error.message}`);
  return (data?.user_id as string | undefined) ?? null;
}

/**
 * Copie l'état d'un abonnement Stripe dans la table billing.
 * Dans cette version de l'API (2026-10-28), current_period_end est porté par les éléments
 * de l'abonnement (SubscriptionItem), plus par l'abonnement lui-même.
 */
export async function syncSubscription(admin: SupabaseClient, sub: Stripe.Subscription, hintUserId?: string | null) {
  const userId = await resolveUserId(admin, sub, hintUserId);
  if (!userId) {
    console.warn("[stripe] abonnement sans utilisateur connu", sub.id);
    return;
  }

  const { data: row, error: readError } = await admin
    .from("billing")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(`billing read: ${readError.message}`);

  const ended = ENDED.has(sub.status);
  // Un ancien abonnement qui se termine ne doit pas écraser un abonnement plus récent.
  if (ended && row?.stripe_subscription_id && row.stripe_subscription_id !== sub.id) {
    console.info("[stripe] fin d'un ancien abonnement ignorée", sub.id);
    return;
  }

  const item = sub.items.data.find((i) => planFromPriceId(i.price.id)) ?? sub.items.data[0];
  const mapped = item ? planFromPriceId(item.price.id) : null;
  if (item && !mapped) console.warn("[stripe] prix inconnu (variables STRIPE_PRICE_* ?)", item.price.id);

  const plan: PlanId = ended || !mapped ? "free" : mapped.plan;
  const interval = mapped?.interval ?? (item?.price.recurring?.interval === "year" ? "year" : item?.price.recurring?.interval === "month" ? "month" : null);

  // Fin de période : sur l'élément (API récente) ; repli sur l'ancien champ si présent.
  const legacyEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  let periodEnd = item?.current_period_end ?? legacyEnd ?? null;
  // Une annulation programmée à une date précise (cancel_at) termine l'abonnement avant la fin de période.
  if (sub.cancel_at && (!periodEnd || sub.cancel_at < periodEnd)) periodEnd = sub.cancel_at;

  const { error } = await admin.from("billing").upsert(
    {
      user_id: userId,
      plan,
      status: sub.status,
      billing_interval: interval,
      stripe_customer_id: idOf(sub.customer),
      stripe_subscription_id: sub.id,
      current_period_end: iso(periodEnd),
      trial_end: iso(sub.trial_end),
      cancel_at_period_end: !ended && (sub.cancel_at_period_end || Boolean(sub.cancel_at)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`billing upsert: ${error.message}`);
}

export { idOf };
