"use client";
// Boutons qui redirigent vers Stripe (Checkout ou portail client), avec état « en cours » et message d'erreur.
import { useActionState } from "react";
import { SubmitButton, FormMessage } from "@/components/forms";
import type { ActionResult } from "@/lib/types";
import { openPortal, startCheckout } from "./actions";

type Variant = "primary" | "secondary" | "ghost";

export function CheckoutButton({
  plan,
  interval,
  label,
  pendingLabel,
  variant = "primary",
}: {
  plan: "individual" | "family";
  interval: "month" | "year";
  label: string;
  pendingLabel: string;
  variant?: Variant;
}) {
  const [state, action] = useActionState<ActionResult | null>(() => startCheckout(plan, interval), null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton variant={variant} pendingLabel={pendingLabel} className="w-full">
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function PortalButton({
  label,
  pendingLabel,
  variant = "secondary",
  full = false,
}: {
  label: string;
  pendingLabel: string;
  variant?: Variant;
  full?: boolean;
}) {
  const [state, action] = useActionState<ActionResult | null>(() => openPortal(), null);
  return (
    <form action={action} className={full ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-3"}>
      <SubmitButton variant={variant} pendingLabel={pendingLabel} className={full ? "w-full" : ""}>
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
