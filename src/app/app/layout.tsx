import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import { SideNav, BottomNav, type NavItem } from "@/components/shell/nav";
import { switchSpace, signOut } from "./actions";
import { addPeriod, todayIso } from "@/lib/format";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ctx = await requireContext();
  const t = await getT("common");

  // Pastille : échéances en retard ou dans les 7 prochains jours.
  const soon = addPeriod(todayIso(), "weekly");
  const { count: dueSoon } = await ctx.supabase
    .from("deadlines")
    .select("id", { count: "exact", head: true })
    .eq("space_id", ctx.space.id)
    .eq("done", false)
    .lte("due_on", soon);

  const main: NavItem[] = [
    { href: "/app", label: t("nav.home"), icon: "home" },
    { href: "/app/echeances", label: t("nav.deadlines"), icon: "calendar", badge: dueSoon ?? 0 },
    { href: "/app/budget", label: t("nav.budget"), icon: "wallet" },
    { href: "/app/abonnements", label: t("nav.recurring"), icon: "repeat" },
  ];
  const more: NavItem[] = [
    { href: "/app/documents", label: t("nav.documents"), icon: "file" },
    { href: "/app/lettres", label: t("nav.letters"), icon: "mail" },
    { href: "/app/fiscalite", label: t("nav.fiscal"), icon: "percent" },
    { href: "/app/rapports", label: t("nav.reports"), icon: "chart" },
    { href: "/app/reglages", label: t("nav.settings"), icon: "settings" },
  ];
  const kindLabel = (k: string) => t(`space.${k}`);

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/app" className="shrink-0" aria-label="Kettlebill">
            <Logo size={30} />
          </Link>
          <div className="flex-1" />
          {ctx.spaces.length > 1 ? (
            <form action={switchSpace} className="min-w-0">
              <label className="sr-only" htmlFor="space-switch">
                {t("space.switch")}
              </label>
              <select
                id="space-switch"
                name="space_id"
                defaultValue={ctx.space.id}
                className="h-10 max-w-[11rem] truncate rounded-xl border border-line bg-surface px-2 text-sm font-semibold"
              >
                {ctx.spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind === "personal" ? kindLabel("personal") : s.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="ms-1 h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold">
                OK
              </button>
            </form>
          ) : (
            <span className="truncate rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-semibold text-muted">
              {kindLabel(ctx.space.kind)}
            </span>
          )}
          <form action={signOut} className="hidden lg:block">
            <button type="submit" className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2">
              <Icon name="logout" size={18} />
              {t("nav.signout")}
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-28 pt-5 lg:pb-12">
        <aside className="sticky top-24 hidden h-fit w-60 shrink-0 lg:block">
          <SideNav items={[...main, ...more]} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav items={main} more={more} moreLabel={t("nav.more")} />
    </div>
  );
}
