// Mise en page des pages légales : en-tête public, colonne de lecture, pied de page.
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
