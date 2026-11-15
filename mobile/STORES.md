# Kettlebill sur l'App Store et Google Play

Le dossier `mobile/` contient les **vraies applications iPhone (`ios/`) et Android (`android/`)**, construites avec Capacitor.
Elles ouvrent l'application web en ligne : mêmes comptes, mêmes données, et chaque mise à jour du site arrive
instantanément dans les apps, sans repasser par les boutiques.

## Avant tout : l'application web doit être en ligne
Les apps affichent `https://kettlebill.com/app` (ou ton adresse Vercel). Fais d'abord Supabase + Vercel (voir `README.md`).
Pour tester avec l'adresse Vercel : `cd mobile && npm install && KETTLEBILL_URL=https://ton-site.vercel.app npx cap sync`.

## Ce que toi seul peux faire (comptes à ton nom)

| Étape | Coût | Durée |
|---|---|---|
| Compte **Apple Developer** (developer.apple.com, en tant qu'individu) | 99 $ US / an | 1 à 2 jours de validation |
| Compte **Google Play Console** (play.google.com/console) | 25 $ US une fois | 1 à 3 jours (vérification d'identité) |
| Un **Mac** avec Xcode, OU un service de compilation en ligne (ex. Codemagic, plan gratuit) | 0 $ | — |

## Paiements dans les apps — règle importante
Apple (règle 3.1.1) et Google exigent que les abonnements numériques achetés **dans** l'app passent par leur système
(commission de 15 % pour les petites entreprises). Stripe n'est pas permis dans l'app, et on ne peut pas y pointer vers le site.
**Déjà fait :** dans les apps, la page Forfait n'affiche pas l'achat Stripe (détection `KettlebillApp-iOS/Android`).
**Prochaine étape recommandée avant la soumission :** ajouter les achats intégrés avec **RevenueCat** (gratuit jusqu'à
2 500 $ US de revenus/mois) : il gère Apple et Google et met à jour le forfait dans Kettlebill par webhook, comme Stripe.
Sans achats intégrés, Apple risque de refuser l'app.

## iPhone — publier sur l'App Store
1. Sur le Mac : `cd mobile && npm install && npx cap sync ios && npx cap open ios` (ouvre Xcode).
2. Xcode → projet **App** → *Signing & Capabilities* → choisis ton équipe Apple ; identifiant : `com.kettlebill.app`.
3. Dans appstoreconnect.apple.com → **Mes apps → +** → nom « Kettlebill », langue principale français, identifiant `com.kettlebill.app`.
4. Xcode → *Product → Archive* → *Distribute App* → App Store Connect.
5. **TestFlight** : ajoute ta conjointe et tes amis comme testeurs (par courriel) → ils installent l'app TestFlight puis Kettlebill.
   C'est la façon officielle de faire tester sur iPhone avant la sortie publique.
6. Fiche de l'app (textes ci-dessous), captures d'écran 6,9" et 6,5", politique de confidentialité
   (`https://kettlebill.com/legal/confidentialite`), « Étiquettes de confidentialité » (ci-dessous), puis **Soumettre pour examen**.
7. Notes pour l'examinateur : fournis un compte de démonstration (courriel + mot de passe) avec des données d'exemple.

## Android — publier sur Google Play
1. `cd mobile && npm install && npx cap sync android`, puis ouvre le dossier `android/` dans **Android Studio**
   (ou en ligne de commande : `npm run android:bundle`, qui exige le SDK Android).
2. Crée une clé de signature (Android Studio → *Build → Generate Signed Bundle*) et **garde-la précieusement**.
3. Play Console → *Créer une application* → « Kettlebill » → téléverse le fichier `.aab`.
4. **Test interne** (jusqu'à 100 testeurs par courriel, disponible en quelques minutes) → puis test fermé → production.
   Les nouveaux comptes personnels doivent faire un test fermé avec au moins 12 testeurs pendant 14 jours avant la production.
5. Pour un test rapide sans Play Store : `npm run android:apk` produit un fichier `.apk` à installer directement sur un Android.

## Textes de la fiche (à coller)
**Nom :** Kettlebill — Budget et paperasse
**Sous-titre (iOS, 30 car.) :** Échéances, budget et documents
**Description courte (Android, 80 car.) :** Échéances, budget, abonnements et documents : ta paperasse enfin tranquille.
**Description :**
Kettlebill rassemble ta vie administrative au même endroit : factures et échéances avec rappels, budget mensuel,
abonnements à surveiller, coffre à documents avec alertes d'expiration, modèles de lettres (résiliation, contestation…)
et une estimation de tes impôts par l'IA selon ton pays. Partage un espace avec ta famille ou ton entreprise.
Disponible dans des dizaines de langues. Kettlebill t'aide à t'organiser ; il ne remplace pas un comptable.

**Catégorie :** Finance · **Âge :** 4+ (iOS) / Tout public (Android)

## Étiquettes de confidentialité (App Store) / Sécurité des données (Google Play)
Données collectées, **liées à l'utilisateur**, **non utilisées pour le suivi publicitaire** :
- Coordonnées : adresse courriel, nom (fonctionnement de l'app, compte)
- Infos financières : montants de budget saisis par l'utilisateur (fonctionnement de l'app)
- Contenu de l'utilisateur : documents et lettres (fonctionnement de l'app)
- Achats : historique d'abonnement (fonctionnement de l'app)
Chiffrement en transit : oui. Suppression du compte : oui, dans Réglages → Données (exigé par Apple et Google).
