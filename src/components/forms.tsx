"use client";
// Formulaires reliés aux actions serveur : état « en cours », message de réussite ou d'erreur.
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/types";
import { buttonClass, cx } from "./ui";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

type ServerAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * <ActionForm action={monAction} submitLabel="Enregistrer"> champs… </ActionForm>
 * L'action serveur reçoit (étatPrécédent, formData) et retourne { ok, message } ou { ok:false, error }.
 * resetOnSuccess vide le formulaire après une réussite.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  resetOnSuccess = false,
  className = "",
  submitVariant = "primary",
  onSuccess,
}: {
  action: ServerAction;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  submitVariant?: "primary" | "secondary" | "danger";
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} action={formAction} className={cx("flex flex-col gap-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={pendingLabel} variant={submitVariant}>
          {submitLabel}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) return state.message ? <p className="text-sm font-semibold text-good" role="status">{state.message}</p> : null;
  return (
    <p className="text-sm font-semibold text-bad" role="alert">
      {state.error}
    </p>
  );
}

/** Bouton de suppression en deux temps (pas de boîte de dialogue du navigateur). */
export function ConfirmButton({
  action,
  label,
  confirmLabel,
  cancelLabel,
  hidden,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  hidden?: Record<string, string>;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={buttonClass("ghost", "sm", "text-bad")}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex items-center gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant="danger" size="sm">
        {confirmLabel}
      </SubmitButton>
      <button type="button" onClick={() => setArmed(false)} className={buttonClass("ghost", "sm")}>
        {cancelLabel}
      </button>
    </form>
  );
}

/** Zone repliable (ex. formulaire « Ajouter »). */
export function Disclosure({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start font-semibold"
      >
        <span>{label}</span>
        <span aria-hidden="true" className={cx("transition", open && "rotate-45")}>＋</span>
      </button>
      {open ? <div className="border-t border-line p-4">{children}</div> : null}
    </div>
  );
}
