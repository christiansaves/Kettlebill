// Webhook Stripe : source de vérité des changements de forfait.
// Exclu du proxy (src/proxy.ts) : pas de session, pas de témoins ; la signature Stripe fait foi.
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { idOf, syncSubscription } from "./sync";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  if (!signature) return json({ error: "missing signature" }, 400);

  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, serverEnv.stripeWebhookSecret());
  } catch (e) {
    console.error("[stripe] signature invalide ou configuration manquante", e instanceof Error ? e.message : e);
    return json({ error: "invalid signature" }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[stripe] SUPABASE_SECRET_KEY manquante", e);
    return json({ error: "server not configured" }, 500);
  }

  // Idempotence : chaque événement n'est traité qu'une fois.
  const { error: insertError } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (insertError) {
    if (insertError.code === "23505") return json({ received: true, duplicate: true });
    console.error("[stripe] stripe_events", insertError);
    return json({ error: "storage" }, 500);
  }

  try {
    await handle(stripe, admin, event);
  } catch (e) {
    console.error("[stripe] échec du traitement", event.type, event.id, e);
    // On oublie l'événement pour que la nouvelle tentative de Stripe soit traitée.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return json({ error: "handler failed" }, 500);
  }

  return json({ received: true });
}

async function handle(stripe: Stripe, admin: ReturnType<typeof createAdminClient>, event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return;
    const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
    const subscriptionId = idOf(session.subscription);
    const customerId = idOf(session.customer);
    if (userId && customerId) {
      const { error } = await admin
        .from("billing")
        .upsert({ user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw new Error(`billing link: ${error.message}`);
    }
    if (subscriptionId) await syncSubscription(admin, await stripe.subscriptions.retrieve(subscriptionId), userId);
    return;
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const sub = event.data.object as Stripe.Subscription;
    // On relit l'abonnement : les événements peuvent arriver dans le désordre.
    await syncSubscription(admin, await stripe.subscriptions.retrieve(sub.id));
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
    if (subscriptionId) await syncSubscription(admin, await stripe.subscriptions.retrieve(subscriptionId));
    return;
  }
}
