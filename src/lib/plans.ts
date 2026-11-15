// Forfaits Kettlebill. Les prix réels vivent dans Stripe (identifiants de prix en variables d'environnement) ;
// les montants ici servent seulement à l'affichage.

export type PlanId = "free" | "individual" | "family";
export type Interval = "month" | "year";

export interface PlanLimits {
  deadlines: number; // échéances actives
  documents: number; // documents stockés
  lettersPerMonth: number;
  fiscalPerMonth: number; // estimations fiscales IA par mois
  aiLettersPerMonth: number; // lettres rédigées par l'IA par mois
  spaces: number; // espaces en plus de l'espace personnel
  membersPerSpace: number;
  emailReminders: boolean;
}

export interface Plan {
  id: PlanId;
  priceCad: { month: number; year: number };
  limits: PlanLimits;
}

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    priceCad: { month: 0, year: 0 },
    limits: {
      deadlines: 5,
      documents: 3,
      lettersPerMonth: 1,
      fiscalPerMonth: 1,
      aiLettersPerMonth: 0,
      spaces: 0,
      membersPerSpace: 1,
      emailReminders: true,
    },
  },
  individual: {
    id: "individual",
    priceCad: { month: 6, year: 60 },
    limits: {
      deadlines: UNLIMITED,
      documents: 200,
      lettersPerMonth: UNLIMITED,
      fiscalPerMonth: 10,
      aiLettersPerMonth: 10,
      spaces: 1,
      membersPerSpace: 2,
      emailReminders: true,
    },
  },
  family: {
    id: "family",
    priceCad: { month: 10, year: 100 },
    limits: {
      deadlines: UNLIMITED,
      documents: 1000,
      lettersPerMonth: UNLIMITED,
      fiscalPerMonth: 30,
      aiLettersPerMonth: 30,
      spaces: 5,
      membersPerSpace: 6,
      emailReminders: true,
    },
  },
};

export const TRIAL_DAYS = 14;

/** Identifiant de prix Stripe pour un forfait payant et une périodicité. */
export function stripePriceId(plan: Exclude<PlanId, "free">, interval: Interval): string | undefined {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTHLY" : "YEARLY"}`;
  return process.env[key];
}

/** Retrouve le forfait à partir d'un identifiant de prix Stripe (webhook). */
export function planFromPriceId(priceId: string): { plan: PlanId; interval: Interval } | null {
  for (const plan of ["individual", "family"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (stripePriceId(plan, interval) === priceId) return { plan, interval };
    }
  }
  return null;
}

/** Un forfait payant n'est actif que si l'abonnement Stripe l'est. */
export function effectivePlan(billing: { plan: string; status: string } | null): PlanId {
  if (!billing) return "free";
  const ok = ["active", "trialing", "past_due"].includes(billing.status);
  return ok && (billing.plan === "individual" || billing.plan === "family") ? billing.plan : "free";
}

export function limitsFor(plan: PlanId): PlanLimits {
  return PLANS[plan].limits;
}

export function isUnlimited(n: number) {
  return !Number.isFinite(n);
}
