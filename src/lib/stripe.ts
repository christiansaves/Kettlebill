import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

let stripe: Stripe | null = null;

/** Client Stripe (clé secrète côté serveur seulement). */
export function getStripe() {
  stripe ??= new Stripe(serverEnv.stripeSecretKey());
  return stripe;
}
