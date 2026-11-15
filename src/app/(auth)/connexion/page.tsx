import type { Metadata } from "next";
import Link from "next/link";
import { getMessages, getT } from "@/lib/i18n/server";
import { isConfigured } from "@/lib/env";
import { Notice } from "@/components/ui";
import { safeNext } from "@/app/auth/safe-next";
import { AuthCard } from "../auth-card";
import { queryErrorKey } from "../auth-errors";
import { MagicLinkForm, SignInForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("signin.metaTitle"), description: t("signin.metaDescription") };
}

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  const [t, m] = await Promise.all([getT("auth"), getMessages("auth")]);
  const errorKey = isConfigured.supabase() ? queryErrorKey(sp.error) : "error.config";

  return (
    <AuthCard title={t("signin.title")} subtitle={t("signin.subtitle")}>
      {errorKey ? (
        <div className="mb-5">
          <Notice tone="bad">{t(errorKey)}</Notice>
        </div>
      ) : null}
      <SignInForm m={m} next={next} />
      <div className="my-6 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <MagicLinkForm m={m} next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        {t("signin.noAccount")}{" "}
        <Link href="/inscription" className="font-semibold text-accent hover:underline">
          {t("signin.createAccount")}
        </Link>
      </p>
    </AuthCard>
  );
}
