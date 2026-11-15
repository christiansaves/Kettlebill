"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "@/components/ui";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/");
}

/** Menu latéral (ordinateur). */
export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigation">
      {items.map((it) => {
        const on = isActive(path, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition",
              on ? "bg-soft text-accent" : "text-ink hover:bg-surface-2",
            )}
          >
            <Icon name={it.icon} />
            <span className="flex-1">{it.label}</span>
            {it.badge ? (
              <span className="rounded-full bg-warn-bg px-2 text-xs font-bold text-warn tabular">{it.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barre du bas (téléphone) : 4 raccourcis + « Plus ». */
export function BottomNav({ items, moreLabel, more }: { items: NavItem[]; moreLabel: string; more: NavItem[] }) {
  const path = usePathname();
  const moreActive = more.some((m) => isActive(path, m.href));
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((it) => {
          const on = isActive(path, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-accent" : "text-muted")}
            >
              <Icon name={it.icon} size={22} />
              <span className="max-w-full truncate px-1">{it.label}</span>
            </Link>
          );
        })}
        <Link
          href="/app/plus"
          className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", moreActive ? "text-accent" : "text-muted")}
        >
          <Icon name="menu" size={22} />
          <span>{moreLabel}</span>
        </Link>
      </div>
    </nav>
  );
}
