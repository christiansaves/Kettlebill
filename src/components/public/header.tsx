import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { Logo, LogoMark } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { LanguageSwitcher } from "./language-switcher";
import { isSignedIn } from "./auth-state";

/** En-tête du site public : logo, liens d'ancre, langue, connexion / essai gratuit (ou « Ouvrir Kettlebill »). */
export async function PublicHeader({ showSections = false }: { showSections?: boolean }) {
  const [t, tc, locale, signedIn] = await Promise.all([getT("landing"), getT("common"), getLocale(), isSignedIn()]);
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-40 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2"
      >
        {t("nav.skip")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <Link href="/" aria-label={t("nav.home")} className="shrink-0 rounded-xl">
          <span className="sm:hidden">
            <LogoMark size={32} />
          </span>
          <span className="hidden sm:inline-flex">
            <Logo size={30} />
          </span>
        </Link>
        {showSections ? (
          <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label={t("nav.features")}>
            <a href="#fonctions" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
              {t("nav.features")}
            </a>
            <a href="#forfaits" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
              {t("nav.pricing")}
            </a>
            <a href="#questions" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
              {t("nav.faq")}
            </a>
          </nav>
        ) : null}
        <div className="flex-1" />
        <LanguageSwitcher
          compact
          current={locale}
          label={tc("lang.label")}
          applyLabel={t("lang.apply")}
          className="hidden sm:block"
        />
        {signedIn ? (
          <ButtonLink href="/app" size="sm" className="h-10">
            {t("nav.open")}
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href="/connexion" variant="ghost" size="sm" className="h-10 px-2.5 sm:px-3">
              {t("nav.signin")}
            </ButtonLink>
            <ButtonLink href="/inscription" size="sm" className="h-10 px-3">
              {t("nav.trial")}
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
