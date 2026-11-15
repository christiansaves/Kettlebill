import type { ReactNode } from "react";

/** Carte des pages d'authentification : titre, sous-titre, contenu. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-34px_var(--scrim)] sm:p-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-muted">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
