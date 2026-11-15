// Mise en page centrée des pages de connexion et d'inscription.
import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getT } from "@/lib/i18n/server";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { PublicFooter } from "@/components/public/footer";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const [t, tl, tc, locale] = await Promise.all([getT("auth"), getT("landing"), getT("common"), getLocale()]);
  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" aria-label={tl("nav.home")} className="rounded-xl">
          <Logo size={30} />
        </Link>
        <LanguageSwitcher compact current={locale} label={tc("lang.label")} applyLabel={tl("lang.apply")} />
      </header>
      <main id="contenu" className="flex flex-1 flex-col items-center justify-center px-3 py-6 sm:px-4">
        <div className="w-full max-w-md">{children}</div>
        <Link href="/" className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-muted hover:text-ink">
          ← {t("back.home")}
        </Link>
      </main>
      <PublicFooter compact />
    </div>
  );
}
