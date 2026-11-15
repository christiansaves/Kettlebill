# Kettlebill — conventions de code

Application d'abonnement (SaaS) pour la paperasse et le budget : particuliers, familles, petites entreprises.
Fondateur au Québec. Langue source : **français** ; anglais traduit à la main ; autres langues traduites par l'IA.

## Pile
- **Next.js 16** (App Router, `src/`), React 19, TypeScript strict, Tailwind CSS v4.
  ⚠️ Next 16 : `middleware` s'appelle `proxy` (déjà en place : `src/proxy.ts`). `params`/`searchParams` sont des **Promises**
  (`const { id } = await params`). `cookies()`/`headers()` sont async. Types globaux `PageProps<"/app/x">`, `LayoutProps<...>`.
  Docs locales : `node_modules/next/dist/docs/01-app/`. Cache Components est **désactivé** (rendu dynamique classique).
- **Supabase** (`@supabase/ssr`) : auth + Postgres + stockage. Schéma : `supabase/migrations/0001_init.sql`
  (types miroir : `src/lib/types.ts`). La sécurité repose sur la RLS : toujours filtrer par `space_id = ctx.space.id`.
- **Stripe** (`src/lib/stripe.ts`), **Resend** (`src/lib/email.ts`), **Anthropic** (`src/lib/ai.ts`).

## Fichiers partagés (NE PAS modifier sans accord — signale le besoin dans ton rapport)
`src/lib/*`, `src/components/{ui,forms,icons,logo}.tsx`, `src/components/shell/*`, `src/app/layout.tsx`,
`src/app/app/layout.tsx`, `src/app/app/actions.ts`, `src/app/globals.css`, `src/messages/common.ts`, `src/messages/index.ts`,
`supabase/migrations/0001_init.sql`.
Si tu as besoin d'une petite fonction utilitaire propre à ton module, mets-la dans le dossier de ton module.

## Contexte utilisateur
```ts
import { requireContext } from "@/lib/session";
const ctx = await requireContext(); // redirige vers /connexion si déconnecté
ctx.supabase   // client RLS au nom de l'utilisateur
ctx.user.id, ctx.user.email, ctx.profile (locale, country, region, currency…)
ctx.space      // espace courant { id, name, kind, role }
ctx.spaces, ctx.plan ("free"|"individual"|"family"), ctx.limits (voir src/lib/plans.ts)
ctx.locale, ctx.currency
```
Dans une **action serveur**, appelle aussi `requireContext()` (il vérifie l'utilisateur) et vérifie que toute ligne modifiée
appartient à `ctx.space.id` (`.eq("space_id", ctx.space.id)` dans chaque update/delete).

## Actions serveur
- Fichier `actions.ts` dans le dossier de la route, avec `"use server"` en tête.
- Signature pour les formulaires : `async function x(prev: ActionResult | null, formData: FormData): Promise<ActionResult>`
  (`ActionResult` dans `src/lib/types.ts`) → utilisé avec `<ActionForm action={x} submitLabel=…>` (`src/components/forms.tsx`).
- Suppression simple : `async function del(formData: FormData): Promise<void>` avec `<ConfirmButton action={del} hidden={{id}} …/>`.
- Valider les entrées (zod est installé). Montants : `parseMoneyToCents` (`src/lib/format.ts`). Stocker en **cents**.
- Après une modification : `revalidatePath("/app/…")`.
- Messages d'erreur : traduits via `getT`.

## Limites des forfaits
`ctx.limits.deadlines`, `.documents`, `.lettersPerMonth`, `.fiscalPerMonth`, `.aiLettersPerMonth`, `.spaces`, `.membersPerSpace`
(`Infinity` = illimité ; `isUnlimited()` dans plans.ts). Vérifier côté serveur AVANT d'insérer ; afficher l'usage dans l'interface
avec un lien vers `/app/reglages/forfait` pour passer à un forfait payant.

## Traductions
- Chaque module a son fichier `src/messages/<module>.ts` : objet `fr` (source, complet) et `en` (anglais, complet aussi).
  Clés en `camelCase.pointé` (ex. `"form.amount"`). Interpolation : `{nom}`.
- Serveur : `const t = await getT("budget")` ; textes communs : `const tc = await getT("common")` (catégories `cat.<clé>`, actions…).
- Client : passer les messages en prop (`const m = await getMessages("budget")`) puis `makeT(m)` de `@/lib/i18n/shared`.
- AUCUN texte visible codé en dur dans les composants : tout passe par les messages (fr + en).
- Ton : chaleureux, simple, tutoiement en français.

## Interface
- Composants : `Card, PageHeader, SectionTitle, Button, ButtonLink, Input, Select, Textarea, Field, Badge, EmptyState, Stat,
  Notice, Progress, cx` (`@/components/ui`), `ActionForm, SubmitButton, ConfirmButton, Disclosure, FormMessage` (`@/components/forms`),
  `Icon` (`@/components/icons`).
- Couleurs Tailwind par jetons uniquement : `bg-bg, bg-surface, bg-surface-2, text-ink, text-muted, border-line, bg-accent,
  text-accent-ink, bg-soft, text-accent, text-warn bg-warn-bg, text-bad bg-bad-bg, text-good bg-good-bg, text-gold`. Jamais de couleur codée.
- Doit fonctionner sur **téléphone (360 px)** et ordinateur : grilles qui passent à 1 colonne, pas de défilement horizontal
  (tableaux dans `overflow-x-auto`), cibles tactiles ≥ 40 px. Utiliser `ms-/me-/ps-/pe-/text-start` (compatible arabe/hébreu).
- Montants : `formatMoney(cents, ctx.currency, ctx.locale)`; dates : `formatDate(iso, ctx.locale)` ; classe `tabular` pour les chiffres.
- Pages = composants serveur ; composants client seulement quand il faut de l'interactivité.

## Vérification
`npx next typegen && npx tsc --noEmit` doit passer, et `npx eslint <tes fichiers>` sans erreur.
Ne lance PAS `next build` (d'autres agents travaillent en parallèle).
