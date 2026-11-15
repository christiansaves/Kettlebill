"use client";
// Formulaires d'authentification (client) : état « en cours », erreurs traduites, écran de confirmation.
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { makeT, type Messages } from "@/lib/i18n/shared";
import type { ActionResult } from "@/lib/types";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icons";
import { requestPasswordReset, sendMagicLink, signIn, signUp, updatePassword } from "./actions";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function ErrorLine({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="flex gap-2 rounded-xl bg-bad-bg px-3 py-2.5 text-sm font-semibold text-bad">
      <Icon name="alert" size={18} className="mt-px shrink-0" />
      <span>{state.error}</span>
    </p>
  );
}

function SuccessPanel({ title, text, hint, children }: { title?: string; text: string; hint?: string; children?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-soft px-5 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink">
        <Icon name="mail" size={22} />
      </span>
      {title ? <p className="font-display text-xl font-bold">{title}</p> : null}
      <p className="text-sm">{text}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

/** Bouton secondaire dont le libellé peut passer à la ligne (libellés longs sur petit écran). */
function WrapSubmit({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-center text-[15px] font-semibold text-ink transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function useAuthAction(action: Action) {
  return useActionState(action, null);
}

export function SignInForm({ m, next }: { m: Messages; next: string }) {
  const t = makeT(m);
  const [state, formAction] = useAuthAction(signIn);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t("field.email")}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" required placeholder={t("placeholder.email")} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Field label={t("field.password")}>
          <Input type="password" name="password" autoComplete="current-password" required />
        </Field>
        <Link href="/mot-de-passe" className="inline-flex min-h-10 items-center self-end text-sm font-semibold text-accent hover:underline">
          {t("signin.forgot")}
        </Link>
      </div>
      <ErrorLine state={state} />
      <SubmitButton pendingLabel={t("signin.pending")} className="w-full" size="lg">
        {t("signin.submit")}
      </SubmitButton>
    </form>
  );
}

export function MagicLinkForm({ m, next }: { m: Messages; next: string }) {
  const t = makeT(m);
  const [state, formAction] = useAuthAction(sendMagicLink);
  if (state?.ok) return <SuccessPanel text={state.message ?? ""} />;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <p className="font-semibold">{t("magic.title")}</p>
        <p className="text-sm text-muted">{t("magic.text")}</p>
      </div>
      <Field label={t("field.email")}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" required placeholder={t("placeholder.email")} />
      </Field>
      <ErrorLine state={state} />
      <WrapSubmit pendingLabel={t("magic.pending")}>{t("magic.submit")}</WrapSubmit>
    </form>
  );
}

export function SignUpForm({ m, next = "/app" }: { m: Messages; next?: string }) {
  const t = makeT(m);
  const [state, formAction] = useAuthAction(signUp);
  if (state?.ok) {
    return (
      <SuccessPanel title={t("signup.checkTitle")} text={state.message ?? ""} hint={t("signup.checkHint")}>
        <Link href="/connexion" className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline">
          {t("signup.signin")}
        </Link>
      </SuccessPanel>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t("field.fullName")}>
        <Input name="full_name" autoComplete="name" required maxLength={120} placeholder={t("placeholder.fullName")} />
      </Field>
      <Field label={t("field.email")}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" required placeholder={t("placeholder.email")} />
      </Field>
      <Field label={t("field.password")} hint={t("hint.password")}>
        <Input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-accent" />
        <span>
          {t("signup.terms.before")}{" "}
          <Link href="/legal/conditions" target="_blank" className="font-semibold text-accent underline">
            {t("signup.terms.terms")}
          </Link>{" "}
          {t("signup.terms.and")}{" "}
          <Link href="/legal/confidentialite" target="_blank" className="font-semibold text-accent underline">
            {t("signup.terms.privacy")}
          </Link>
          .
        </span>
      </label>
      <ErrorLine state={state} />
      <SubmitButton pendingLabel={t("signup.pending")} className="w-full" size="lg">
        {t("signup.submit")}
      </SubmitButton>
    </form>
  );
}

export function ForgotForm({ m }: { m: Messages }) {
  const t = makeT(m);
  const [state, formAction] = useAuthAction(requestPasswordReset);
  if (state?.ok) {
    return (
      <SuccessPanel text={state.message ?? ""}>
        <Link href="/connexion" className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline">
          {t("forgot.backToSignin")}
        </Link>
      </SuccessPanel>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("field.email")}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" required placeholder={t("placeholder.email")} />
      </Field>
      <ErrorLine state={state} />
      <SubmitButton pendingLabel={t("forgot.pending")} className="w-full" size="lg">
        {t("forgot.submit")}
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ m }: { m: Messages }) {
  const t = makeT(m);
  const [state, formAction] = useAuthAction(updatePassword);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("field.newPassword")} hint={t("hint.password")}>
        <Input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <Field label={t("field.confirmPassword")}>
        <Input type="password" name="confirm" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <ErrorLine state={state} />
      <SubmitButton pendingLabel={t("reset.pending")} className="w-full" size="lg">
        {t("reset.submit")}
      </SubmitButton>
    </form>
  );
}
