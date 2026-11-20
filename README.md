# Kettlebill

Ta paperasse et ton budget, enfin tranquilles.
Application d'abonnement pour particuliers, familles et petites entreprises : échéances et rappels, budget, abonnements,
coffre à documents, lettres, estimation fiscale par l'IA, espaces partagés, toutes les langues. Fonctionne sur téléphone
(installable comme une app) et sur ordinateur.

> ⚠️ Kettlebill aide à s'organiser. Il ne remplace pas un comptable, un fiscaliste ni un avocat.

## Ce qu'il y a dans ce dossier

| Dossier | Contenu |
|---|---|
| `src/app/` | Les pages (site public, connexion, application `/app/...`) et les routes serveur (`/api/...`) |
| `src/lib/` | Le socle : session, forfaits, IA, Stripe, courriels, traductions, formatage |
| `src/messages/` | Tous les textes de l'interface (français + anglais ; les autres langues sont traduites par l'IA) |
| `src/components/` | Les éléments d'interface réutilisables |
| `supabase/migrations/` | La base de données et ses règles de sécurité (à exécuter une fois dans Supabase) |
| `supabase/tests/` | Tests de sécurité de la base (exécutés en local) |
| `CONVENTIONS.md` | Règles de code pour les développeurs |

**Pile technique :** Next.js 16 · Supabase (comptes, base Postgres, fichiers) · Stripe (abonnements) · Resend (courriels) ·
API Anthropic (IA) · hébergement Vercel.

---

## Mise en ligne — guide pas à pas

Compte environ 1 à 2 heures la première fois. Tu auras besoin d'une carte de crédit pour les services payants
(Supabase Pro et Vercel Pro sont optionnels au début : les forfaits gratuits suffisent pour tester).

### 1. Le nom de domaine
Achète `kettlebill.com` (et `kettlebill.ca` si tu veux) chez un registraire (ex. Namecheap, Cloudflare, Porkbun).
Au 15 novembre 2026, aucun des deux n'était enregistré.

### 2. Supabase (comptes + base de données + fichiers)
1. Crée un compte sur supabase.com → **New project** → région **Canada (Central)** si offerte, sinon US East.
2. Menu **SQL Editor** → colle le fichier `supabase/migrations/0001_init.sql` → **Run**, puis fais de même avec
   `supabase/migrations/0002_scan.sql` (scanner de reçus).
3. Menu **Authentication → URL Configuration** :
   - *Site URL* : `https://kettlebill.com`
   - *Redirect URLs* : `https://kettlebill.com/auth/callback`, `http://localhost:3000/auth/callback`
4. Menu **Authentication → Emails** : personnalise les courriels (confirmation, mot de passe oublié) en français.
   Pour la production, branche l'envoi SMTP sur Resend (Authentication → SMTP Settings).
5. Menu **Project Settings → API** : copie l'URL du projet, la clé *publishable* et la clé *secret*.

### 3. Stripe (paiements)
1. Crée un compte sur stripe.com (entreprise individuelle, Canada). Reste en **mode test** au début.
2. **Produits** (Catalogue de produits → Ajouter), prix récurrents en **CAD**, comportement fiscal « exclusif » (taxes en sus) :
   - « Individuel » : 6 $ / mois et 60 $ / an → `STRIPE_PRICE_INDIVIDUAL_MONTHLY`, `STRIPE_PRICE_INDIVIDUAL_YEARLY`
   - « Famille et entreprise » : 10 $ / mois et 100 $ / an → `STRIPE_PRICE_FAMILY_MONTHLY`, `STRIPE_PRICE_FAMILY_YEARLY`
   - Ne mets pas d'essai sur les prix : le code ajoute l'essai de 14 jours.
3. **Webhook** (Développeurs → Webhooks → Ajouter un point de terminaison) : `https://kettlebill.com/api/stripe/webhook`,
   version d'API `2026-10-28.endive`, événements : `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`,
   `customer.subscription.resumed`, `invoice.payment_failed`. Copie le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
4. **Portail client** (Paramètres → Facturation → Portail client) : active l'historique des factures, la mise à jour du
   moyen de paiement et de l'adresse, l'annulation en fin de période, le changement de forfait (les 2 produits, 4 prix,
   avec prorata). URL de retour : `https://kettlebill.com/app/reglages/forfait`.
5. **Taxes (plus tard)** : quand tu seras inscrit à la TPS/TVQ, configure Stripe Tax (adresse d'origine au Québec,
   inscriptions TPS/TVQ, code fiscal « SaaS ») puis mets `STRIPE_AUTOMATIC_TAX=true`.
6. **Courriels Stripe** (Paramètres → Facturation → Abonnements et courriels) : active le rappel avant la fin de l'essai
   et les courriels de paiement échoué — les conditions d'utilisation promettent un rappel avant la fin de l'essai.
7. Copie la clé secrète (Développeurs → Clés API) dans `STRIPE_SECRET_KEY`.

### 4. Anthropic (IA)
console.anthropic.com → crée une clé API → ajoute un plafond de dépenses mensuel (ex. 50 $) dans *Limits*.

### 5. Resend (courriels de rappel)
resend.com → ajoute ton domaine (`kettlebill.com`) et ajoute chez ton registraire les enregistrements DNS demandés
→ crée une clé API.

### 6. Vercel (hébergement)
1. Mets ce dossier sur GitHub (dépôt privé).
2. vercel.com → **Add New Project** → importe le dépôt.
3. Dans **Settings → Environment Variables**, ajoute toutes les variables de `.env.example` avec tes vraies valeurs
   (`NEXT_PUBLIC_SITE_URL=https://kettlebill.com`, `CRON_SECRET` = une longue chaîne aléatoire).
4. **Deploy**. Puis **Settings → Domains** → ajoute `kettlebill.com` et suis les instructions DNS.
5. La tâche planifiée des rappels (`vercel.json`) s'active toute seule : elle s'exécute chaque jour à 12 h UTC.

### 7. Vérifications avant d'ouvrir au public
- [ ] Crée un compte test, confirme le courriel, ajoute une échéance, un document, une transaction.
- [ ] Fais un abonnement test avec la carte Stripe `4242 4242 4242 4242` (mode test), vérifie que le forfait change.
- [ ] Teste l'estimation fiscale et une lettre rédigée par l'IA.
- [ ] Fais réviser les pages `/legal/confidentialite` et `/legal/conditions` par un avocat, et complète le nom du
      responsable de la protection des renseignements personnels (Loi 25).
- [ ] Passe Stripe en mode réel (clés *live*), refais le webhook en mode réel.
- [ ] Inscription TPS/TVQ dès que tes ventes approchent 30 000 $ sur quatre trimestres (avec ton comptable).

---

## Développement local

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```

Tester les webhooks Stripe en local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Tester la sécurité de la base (PostgreSQL 16 local) :
```bash
createdb kb && psql -d kb -f supabase/tests/supabase_stubs.sql \
  && psql -d kb -f supabase/migrations/0001_init.sql && psql -d kb -f supabase/tests/rls_test.sql
```

## Coûts mensuels estimés
Environ 60 $ US au départ, 140 $ avec 100 abonnés, 840 $ avec 1 000 abonnés (voir le plan technique).
Le coût de l'IA par utilisateur est suivi dans la table `ai_usage`, et chaque forfait a des limites mensuelles
(`src/lib/plans.ts`).
