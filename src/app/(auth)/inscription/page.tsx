import type { Metadata } from "next";
import Link from "next/link";
import { getMessages, getT } from "@/lib/i18n/server";
import { isConfigured } from "@/lib/env";
import { Notice } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { SignUpForm } from "../forms";
import { safeNext } from "@/app/auth/safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("signup.metaTitle"), description: t("signup.metaDescription") };
}

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  const [t, m] = await Promise.all([getT("auth"), getMessages("auth")]);
  return (
    <AuthCard title={t("signup.title")} subtitle={t("signup.subtitle")}>
      {!isConfigured.supabase() ? (
        <div className="mb-5">
          <Notice tone="bad">{t("error.config")}</Notice>
        </div>
      ) : null}
      <SignUpForm m={m} next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        {t("signup.haveAccount")}{" "}
        <Link href={next === "/app" ? "/connexion" : `/connexion?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">
          {t("signup.signin")}
        </Link>
      </p>
    </AuthCard>
  );
}
