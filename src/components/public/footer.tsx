import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "./language-switcher";

const linkClass = "inline-flex min-h-10 items-center text-sm text-muted hover:text-ink";

/** Pied de page du site public : liens, langue (avec la note sur la traduction IA) et avertissement commun. */
export async function PublicFooter({ compact = false }: { compact?: boolean }) {
  const [t, tc, locale] = await Promise.all([getT("landing"), getT("common"), getLocale()]);
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="px-4 py-8 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5" aria-label={t("footer.legal")}>
          <Link href="/legal/confidentialite" className={linkClass}>
            {tc("footer.privacy")}
          </Link>
          <Link href="/legal/conditions" className={linkClass}>
            {tc("footer.terms")}
          </Link>
        </nav>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted">{tc("footer.disclaimer")}</p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-line bg-surface" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="min-w-0">
          <Link href="/" aria-label={t("nav.home")} className="inline-flex rounded-xl">
            <Logo size={30} />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">{t("footer.tagline")}</p>
          <LanguageSwitcher
            current={locale}
            label={tc("lang.label")}
            applyLabel={t("lang.apply")}
            note={tc("lang.aiNote")}
            className="mt-6 max-w-xs"
          />
        </div>
        <nav aria-label={t("footer.product")}>
          <h2 className="text-sm font-bold">{t("footer.product")}</h2>
          <ul className="mt-2">
            <li><Link href="/#fonctions" className={linkClass}>{t("nav.features")}</Link></li>
            <li><Link href="/#forfaits" className={linkClass}>{t("nav.pricing")}</Link></li>
            <li><Link href="/#questions" className={linkClass}>{t("nav.faq")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("footer.account")}>
          <h2 className="text-sm font-bold">{t("footer.account")}</h2>
          <ul className="mt-2">
            <li><Link href="/connexion" className={linkClass}>{t("nav.signin")}</Link></li>
            <li><Link href="/inscription" className={linkClass}>{t("footer.signup")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("footer.legal")}>
          <h2 className="text-sm font-bold">{t("footer.legal")}</h2>
          <ul className="mt-2">
            <li><Link href="/legal/confidentialite" className={linkClass}>{tc("footer.privacy")}</Link></li>
            <li><Link href="/legal/conditions" className={linkClass}>{tc("footer.terms")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">{tc("footer.disclaimer")}</p>
          <p className="shrink-0">{t("footer.rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
