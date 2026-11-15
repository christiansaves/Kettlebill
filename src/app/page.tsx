// Page d'accueil publique de Kettlebill.
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { intlLocale } from "@/lib/format";
import { PLANS, TRIAL_DAYS, isUnlimited, type PlanId } from "@/lib/plans";
import { ButtonLink, Notice, cx } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { isSignedIn } from "@/components/public/auth-state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("landing");
  return {
    title: { absolute: t("meta.title") },
    description: t("meta.description"),
    openGraph: { title: t("meta.title"), description: t("meta.description"), type: "website", siteName: "Kettlebill" },
  };
}

const FEATURES: { key: string; icon: IconName }[] = [
  { key: "deadlines", icon: "calendar" },
  { key: "budget", icon: "chart" },
  { key: "recurring", icon: "repeat" },
  { key: "documents", icon: "file" },
  { key: "letters", icon: "mail" },
  { key: "fiscal", icon: "percent" },
  { key: "spaces", icon: "users" },
  { key: "languages", icon: "sparkle" },
];

const FAQ = ["security", "hosting", "cancel", "ai", "tax", "business"];

export default async function Home({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).compte === "supprime";
  const [t, tc, locale, signedIn] = await Promise.all([getT("landing"), getT("common"), getLocale(), isSignedIn()]);
  const money = new Intl.NumberFormat(intlLocale(locale, "CA"), {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader showSections />

      <main id="contenu" className="flex-1">
        {deleted ? (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <Notice tone="good">{t("accountDeleted")}</Notice>
          </div>
        ) : null}
        {/* ------------------------------------------------------------ Héros */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-soft blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
                {t("hero.eyebrow")}
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">{t("hero.title")}</h1>
              <p className="mt-5 max-w-xl text-lg text-muted">{t("hero.text")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {signedIn ? (
                  <ButtonLink href="/app" size="lg">
                    {t("nav.open")}
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/inscription" size="lg">
                    {t("hero.ctaPrimary")}
                  </ButtonLink>
                )}
                <ButtonLink href="#forfaits" variant="secondary" size="lg">
                  {t("hero.ctaSecondary")}
                </ButtonLink>
              </div>
              <p className="mt-5 text-sm text-muted">{t("hero.reassure")}</p>
            </div>
            <HeroVisual t={t} />
          </div>
        </section>

        {/* ------------------------------------------------------------ Histoire du nom */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-14 text-center sm:flex-row sm:text-start">
            <TeaIllustration className="h-24 w-28 shrink-0" />
            <div>
              <h2 className="font-display text-2xl font-bold">{t("story.title")}</h2>
              <p className="mt-2 text-muted">{t("story.text")}</p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ Fonctions */}
        <section id="fonctions" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <SectionIntro eyebrow={t("features.eyebrow")} title={t("features.title")} text={t("features.text")} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <li key={f.key} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-accent">
                    <Icon name={f.icon} size={22} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t(`feature.${f.key}.title`)}</h3>
                  <p className="mt-1.5 text-sm text-muted">{t(`feature.${f.key}.text`)}</p>
                  {f.key === "fiscal" ? (
                    <p className="mt-3 flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-xs font-semibold text-warn">
                      <Icon name="alert" size={16} className="mt-px shrink-0" />
                      <span>{t("feature.fiscal.note")}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ Comment ça marche */}
        <section className="bg-soft">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center font-display text-3xl font-bold">{t("how.title")}</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-ink">
                    {n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{t(`how.step${n}.title`)}</h3>
                    <p className="mt-1 text-muted">{t(`how.step${n}.text`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ Forfaits */}
        <section id="forfaits" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <SectionIntro eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} text={t("pricing.text")} />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {(Object.keys(PLANS) as PlanId[]).map((id) => (
                <PlanCard key={id} id={id} t={t} tc={tc} money={money} signedIn={signedIn} />
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted">{t("pricing.taxes")}</p>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section id="questions" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
            <SectionIntro eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-bg">
              {FAQ.map((k) => (
                <details key={k} className="group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                    <span>{t(`faq.${k}.q`)}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-accent transition group-open:rotate-45"
                    >
                      <Icon name="plus" size={16} />
                    </span>
                  </summary>
                  <p className="pb-5 text-muted">{t(`faq.${k}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ Appel final */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl bg-accent px-6 py-12 text-center text-accent-ink sm:px-12">
            <TeaIllustration className="h-20 w-24" inverted />
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{t("cta.title")}</h2>
            <p className="mt-3 max-w-xl opacity-90">{t("cta.text")}</p>
            <ButtonLink
              href={signedIn ? "/app" : "/inscription"}
              variant="secondary"
              size="lg"
              className="mt-7"
            >
              {signedIn ? t("nav.open") : t("cta.button")}
            </ButtonLink>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      {text ? <p className="mt-3 text-lg text-muted">{text}</p> : null}
    </div>
  );
}

function PlanCard({
  id,
  t,
  tc,
  money,
  signedIn,
}: {
  id: PlanId;
  t: T;
  tc: T;
  money: Intl.NumberFormat;
  signedIn: boolean;
}) {
  const plan = PLANS[id];
  const l = plan.limits;
  const featured = id === "individual";
  const paid = id !== "free";

  const many = (n: number, one: string, other: string) => t(n === 1 ? one : other, { n });
  const items: { text: string; included: boolean }[] = [
    { text: isUnlimited(l.deadlines) ? t("limit.deadlines.unlimited") : t("limit.deadlines", { n: l.deadlines }), included: true },
    { text: isUnlimited(l.documents) ? t("limit.documents.unlimited") : t("limit.documents", { n: l.documents }), included: true },
    {
      text: isUnlimited(l.lettersPerMonth)
        ? t("limit.letters.unlimited")
        : many(l.lettersPerMonth, "limit.letters", "limit.letters.many"),
      included: true,
    },
    {
      text: l.aiLettersPerMonth > 0 ? t("limit.aiLetters", { n: l.aiLettersPerMonth }) : t("limit.aiLetters.none"),
      included: l.aiLettersPerMonth > 0,
    },
    { text: many(l.fiscalPerMonth, "limit.fiscal", "limit.fiscal.many"), included: true },
    {
      text: l.spaces === 0 ? t("limit.spaces.none") : l.spaces === 1 ? t("limit.spaces.one") : t("limit.spaces.many", { n: l.spaces }),
      included: true,
    },
    ...(l.membersPerSpace > 1 ? [{ text: t("limit.members", { n: l.membersPerSpace }), included: true }] : []),
    ...(l.emailReminders ? [{ text: t("limit.reminders"), included: true }] : []),
  ];

  const href = signedIn ? "/app" : "/inscription";
  const cta = signedIn ? t("pricing.ctaOpen") : paid ? t("pricing.ctaPaid", { days: TRIAL_DAYS }) : t("pricing.ctaFree");

  return (
    <article
      className={cx(
        "relative flex flex-col rounded-3xl border bg-surface p-6",
        featured ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line",
      )}
    >
      {featured ? (
        <span className="absolute -top-3 start-6 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-ink">
          {t("pricing.popular")}
        </span>
      ) : null}
      <h3 className="text-xl font-bold">{tc(`plan.${id}`)}</h3>
      <p className="mt-1 text-sm text-muted">{t(`pricing.desc.${id}`)}</p>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="tabular font-display text-4xl font-bold">{money.format(plan.priceCad.month)}</span>
        <span className="text-muted">{t("pricing.perMonth")}</span>
      </p>
      <div className="mt-1 min-h-10 text-sm text-muted">
        {paid ? (
          <>
            <p>
              <span className="tabular">{t("pricing.orYear", { price: money.format(plan.priceCad.year) })}</span>
              <span className="ms-2 rounded-full bg-good-bg px-2 py-0.5 text-xs font-semibold text-good">{t("pricing.yearSave")}</span>
            </p>
            <p className="mt-1 font-semibold text-accent">{t("pricing.trial", { days: TRIAL_DAYS })}</p>
          </>
        ) : null}
      </div>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {items.map((it) => (
          <li key={it.text} className={cx("flex gap-2.5", !it.included && "text-muted")}>
            <span
              aria-hidden="true"
              className={cx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                it.included ? "bg-soft text-accent" : "bg-surface-2 text-muted",
              )}
            >
              {it.included ? <Icon name="check" size={13} strokeWidth={3} /> : <span className="h-0.5 w-2 rounded bg-muted" />}
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
      <ButtonLink href={href} variant={featured ? "primary" : "secondary"} className="mt-7 w-full">
        {cta}
      </ButtonLink>
    </article>
  );
}

/** Aperçu de l'application dans le héros (purement décoratif, textes traduits). */
function HeroVisual({ t }: { t: T }) {
  const rows = [
    { title: t("hero.mock.item1"), when: t("hero.mock.item1.when"), amount: t("hero.mock.item1.amount"), icon: "calendar" as const, done: true },
    { title: t("hero.mock.item2"), when: t("hero.mock.item2.when"), amount: t("hero.mock.item2.amount"), icon: "repeat" as const, done: false },
    { title: t("hero.mock.item3"), when: t("hero.mock.item3.when"), amount: "", icon: "file" as const, done: false },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <TeaIllustration className="absolute -top-12 end-2 h-24 w-28 sm:-top-14 sm:h-28 sm:w-32" />
      <div className="relative rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-30px_var(--scrim)]">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">{t("hero.mock.title")}</p>
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-gold" />
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <li key={r.title} className="flex items-center gap-3 rounded-2xl border border-line bg-bg p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft text-accent">
                <Icon name={r.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.title}</span>
                <span className={cx("block text-xs", r.done ? "text-good" : "text-warn")}>{r.done ? t("hero.mock.done") : r.when}</span>
              </span>
              {r.amount ? <span className="tabular shrink-0 text-sm font-semibold">{r.amount}</span> : null}
              {r.done ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-bg text-good">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-soft p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{t("hero.mock.budget")}</span>
            <span className="tabular text-muted">{t("hero.mock.budgetValue")}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full w-[69%] rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tasse de thé fumante posée sur une facture : l'idée de Kettlebill. */
function TeaIllustration({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  const cup = inverted ? "var(--accent-ink)" : "var(--accent)";
  const paper = inverted ? "var(--accent)" : "var(--surface)";
  const line = inverted ? "var(--accent-ink)" : "var(--line)";
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden="true" focusable="false">
      {/* facture */}
      <g transform="rotate(-8 50 70)">
        <rect x="14" y="40" width="58" height="62" rx="6" fill={paper} stroke={line} strokeWidth="2" />
        <rect x="22" y="50" width="28" height="4" rx="2" fill={line} />
        <rect x="22" y="60" width="40" height="3" rx="1.5" fill={line} opacity="0.7" />
        <rect x="22" y="68" width="34" height="3" rx="1.5" fill={line} opacity="0.7" />
        <rect x="22" y="76" width="38" height="3" rx="1.5" fill={line} opacity="0.7" />
        <path d="M24 89l4 4 9-9" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* vapeur */}
      <path d="M86 30c-4-5 4-8 0-14" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 28c-4-5 4-8 0-14" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M110 30c-4-5 4-8 0-14" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      {/* soucoupe */}
      <ellipse cx="98" cy="96" rx="34" ry="6" fill={cup} opacity="0.25" />
      {/* tasse */}
      <path d="M72 40h52l-4 38a12 12 0 0 1-12 10H88a12 12 0 0 1-12-10z" fill={cup} />
      <path d="M123 50c9-1 13 5 11 11s-8 9-14 8" fill="none" stroke={cup} strokeWidth="5" strokeLinecap="round" />
      {/* étiquette du sachet de thé */}
      <path d="M84 40v14" stroke={paper} strokeWidth="1.5" />
      <rect x="79" y="54" width="10" height="12" rx="2" fill="var(--gold)" />
    </svg>
  );
}
