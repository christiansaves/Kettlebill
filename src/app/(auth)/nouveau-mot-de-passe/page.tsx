import type { Metadata } from "next";
import { getMessages, getT } from "@/lib/i18n/server";
import { ButtonLink, Notice } from "@/components/ui";
import { isSignedIn } from "@/components/public/auth-state";
import { AuthCard } from "../auth-card";
import { ResetForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("reset.metaTitle"), description: t("reset.metaDescription"), robots: { index: false } };
}

export default async function NewPasswordPage() {
  const [t, m, signedIn] = await Promise.all([getT("auth"), getMessages("auth"), isSignedIn()]);
  return (
    <AuthCard title={t("reset.title")} subtitle={signedIn ? t("reset.subtitle") : undefined}>
      {signedIn ? (
        <ResetForm m={m} />
      ) : (
        <div className="flex flex-col gap-4">
          <Notice tone="warn">{t("reset.noSession")}</Notice>
          <ButtonLink href="/mot-de-passe" className="w-full">
            {t("reset.requestNew")}
          </ButtonLink>
        </div>
      )}
    </AuthCard>
  );
}
