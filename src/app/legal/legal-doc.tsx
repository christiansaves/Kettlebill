// Rendu d'un document légal à partir des clés de src/messages/legal.ts (voir la grammaire en tête de ce fichier).
import Link from "next/link";
import legal from "@/messages/legal";
import { getT } from "@/lib/i18n/server";
import { Icon } from "@/components/icons";

type Doc = "privacy" | "terms";
type Block = { kind: "p"; key: string } | { kind: "ul"; keys: string[] };
type Section = { id: string; heading: string; blocks: Block[] };

/** Regroupe les clés « doc.section.(h|pN|liN) » en sections, dans l'ordre du fichier source. */
function structure(doc: Doc): Section[] {
  const sections: Section[] = [];
  for (const key of Object.keys(legal.fr)) {
    const m = key.match(/^([a-z]+)\.([a-z]+)\.(h|p\d+|li\d+)$/);
    if (!m || m[1] !== doc) continue;
    const [, , id, part] = m;
    let s = sections.find((x) => x.id === id);
    if (!s) {
      s = { id, heading: "", blocks: [] };
      sections.push(s);
    }
    if (part === "h") s.heading = key;
    else if (part.startsWith("p")) s.blocks.push({ kind: "p", key });
    else {
      const last = s.blocks[s.blocks.length - 1];
      if (last?.kind === "ul") last.keys.push(key);
      else s.blocks.push({ kind: "ul", keys: [key] });
    }
  }
  return sections.filter((s) => s.heading);
}

export async function LegalDoc({ doc }: { doc: Doc }) {
  const t = await getT("legal");
  const sections = structure(doc);
  const other: { doc: Doc; href: string } = doc === "privacy" ? { doc: "terms", href: "/legal/conditions" } : { doc: "privacy", href: "/legal/confidentialite" };

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <nav aria-label={t("toc")} className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-bold">{t("toc")}</p>
          <ol className="mt-2 space-y-0.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-ink">
                  <span className="tabular w-5 shrink-0 text-xs">{i + 1}.</span>
                  <span className="min-w-0">{t(s.heading)}</span>
                </a>
              </li>
            ))}
          </ol>
          <Link
            href={other.href}
            className="mt-3 flex min-h-10 items-center gap-2 border-t border-line pt-3 text-sm font-semibold text-accent hover:underline"
          >
            <Icon name="file" size={16} />
            {t(other.doc === "privacy" ? "nav.privacy" : "nav.terms")}
          </Link>
        </nav>
      </aside>

      <article className="min-w-0 max-w-3xl">
        <p role="note" className="flex gap-2.5 rounded-xl border border-transparent bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">
          <Icon name="alert" size={18} className="mt-px shrink-0" />
          <span>{t("draft")}</span>
        </p>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{t(`${doc}.title`)}</h1>
        <p className="mt-2 text-sm text-muted">{t("updated", { date: t("updatedPlaceholder") })}</p>
        <p className="mt-6 text-lg leading-relaxed">{t(`${doc}.intro`)}</p>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
            <h2 className="flex gap-3 text-xl font-bold sm:text-2xl">
              <span className="tabular text-accent">{i + 1}.</span>
              <span>{t(s.heading)}</span>
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed">
              {s.blocks.map((b) =>
                b.kind === "p" ? (
                  <p key={b.key}>{t(b.key)}</p>
                ) : (
                  <ul key={b.keys[0]} className="space-y-2 ps-1">
                    {b.keys.map((k) => (
                      <li key={k} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{t(k)}</span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}

        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">{t("frenchPrevails")}</p>
      </article>
    </div>
  );
}
