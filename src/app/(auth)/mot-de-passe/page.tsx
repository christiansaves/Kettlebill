import type { Metadata } from "next";
import Link from "next/link";
import { getMessages, getT } from "@/lib/i18n/server";
import { isConfigured } from "@/lib/env";
import { Notice } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { ForgotForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("forgot.metaTitle"), description: t("forgot.metaDescription") };
}

export default async function ForgotPasswordPage() {
  const [t, m] = await Promise.all([getT("auth"), getMessages("auth")]);
  return (
    <AuthCard title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      {!isConfigured.supabase() ? (
        <div className="mb-5">
          <Notice tone="bad">{t("error.config")}</Notice>
        </div>
      ) : null}
      <ForgotForm m={m} />
      <p className="mt-6 text-center text-sm">
        <Link href="/connexion" className="font-semibold text-accent hover:underline">
          {t("forgot.backToSignin")}
        </Link>
      </p>
    </AuthCard>
  );
}
