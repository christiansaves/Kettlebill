import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { signOut } from "../actions";

export default async function MorePage() {
  const t = await getT("common");
  const links: { href: string; label: string; icon: IconName }[] = [
    { href: "/app/abonnements", label: t("nav.recurring"), icon: "repeat" },
    { href: "/app/documents", label: t("nav.documents"), icon: "file" },
    { href: "/app/lettres", label: t("nav.letters"), icon: "mail" },
    { href: "/app/fiscalite", label: t("nav.fiscal"), icon: "percent" },
    { href: "/app/rapports", label: t("nav.reports"), icon: "chart" },
    { href: "/app/reglages", label: t("nav.settings"), icon: "settings" },
  ];
  return (
    <>
      <PageHeader title={t("nav.more")} />
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 font-semibold">
              <Icon name={l.icon} />
              {l.label}
            </Link>
          </li>
        ))}
        <li>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 font-semibold text-bad">
              <Icon name="logout" />
              {t("nav.signout")}
            </button>
          </form>
        </li>
      </ul>
    </>
  );
}
