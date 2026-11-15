// Textes du module « legal » (politique de confidentialité et conditions d'utilisation).
// Les sections sont rendues dans l'ordre des clés de `fr` :
//   <doc>.<section>.h   → titre de section
//   <doc>.<section>.pN  → paragraphe
//   <doc>.<section>.liN → élément de liste (les éléments consécutifs forment une liste)
// fr = source (obligatoire), en = traduction anglaise.
const fr = {
  "title": "Légal",
  "draft": "Brouillon — à faire réviser par un avocat avant la mise en ligne.",
  "updated": "Dernière mise à jour : {date}",
  "updatedPlaceholder": "[date à compléter]",
  "toc": "Sur cette page",
  "frenchPrevails": "En cas de divergence entre les versions, la version française prévaut.",
  "nav.privacy": "Politique de confidentialité",
  "nav.terms": "Conditions d'utilisation",

  // ---------------------------------------------------------------- Politique de confidentialité
  "privacy.metaTitle": "Politique de confidentialité",
  "privacy.metaDescription":
    "Comment Kettlebill recueille, utilise, protège et conserve tes renseignements personnels, et comment exercer tes droits.",
  "privacy.title": "Politique de confidentialité",
  "privacy.intro":
    "Ta vie administrative est personnelle. Cette politique explique, en mots simples, quels renseignements Kettlebill recueille, pourquoi, avec qui ils sont partagés, combien de temps ils sont gardés et comment tu peux exercer tes droits. Elle vise à respecter la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25), la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada et, pour les personnes situées en Europe, les principes du Règlement général sur la protection des données (RGPD).",

  "privacy.who.h": "Qui sommes-nous",
  "privacy.who.p1":
    "Kettlebill est un service en ligne d'organisation administrative et de budget exploité par [Nom de l'entreprise — à compléter], dont l'établissement est situé au [adresse — à compléter], Québec, Canada (« Kettlebill », « nous »).",

  "privacy.officer.h": "Responsable de la protection des renseignements personnels",
  "privacy.officer.p1":
    "La personne responsable de la protection des renseignements personnels chez Kettlebill est : [Nom du responsable — à compléter], [titre — à compléter].",
  "privacy.officer.p2":
    "Pour toute question, demande d'accès ou plainte concernant tes renseignements personnels, écris à : [adresse courriel de contact — à compléter]. Nous répondons par écrit dans un délai de 30 jours.",

  "privacy.data.h": "Renseignements que nous recueillons",
  "privacy.data.p1": "Nous recueillons seulement ce qui est nécessaire pour faire fonctionner le service :",
  "privacy.data.li1": "Compte : nom, adresse courriel, mot de passe (stocké sous forme chiffrée par notre fournisseur d'authentification — nous ne le voyons jamais), langue, pays, région, devise et préférences d'affichage.",
  "privacy.data.li2": "Contenu que tu ajoutes : échéances, transactions et budgets, abonnements, documents téléversés et leurs métadonnées (titre, catégorie, date d'expiration), lettres, estimations fiscales et les données que tu saisis pour les obtenir (revenus, situation familiale, etc.).",
  "privacy.data.li3": "Espaces partagés : les personnes que tu invites dans un espace famille ou entreprise (adresse courriel) et leur rôle.",
  "privacy.data.li4": "Facturation : forfait, statut de l'abonnement et identifiants de client Stripe. Les numéros de carte sont traités directement par Stripe ; nous ne les recevons pas.",
  "privacy.data.li5": "Données techniques : journaux de connexion et d'erreurs (adresse IP, type de navigateur, date et heure), compteurs d'utilisation des fonctions IA, nécessaires à la sécurité et au respect des limites des forfaits.",
  "privacy.data.p2":
    "Nous ne vendons pas tes renseignements personnels, nous n'affichons pas de publicité et nous n'utilisons pas d'outil de suivi publicitaire. Aucune fonction de profilage n'est activée.",

  "privacy.purposes.h": "Pourquoi nous les utilisons",
  "privacy.purposes.li1": "Fournir le service : afficher tes données, calculer ton budget, envoyer les rappels par courriel que tu as activés.",
  "privacy.purposes.li2": "Gérer ton compte, ton abonnement, l'essai gratuit et la facturation.",
  "privacy.purposes.li3": "Exécuter les fonctions IA que tu demandes (lettres, estimation fiscale, traduction de l'interface).",
  "privacy.purposes.li4": "Assurer la sécurité, prévenir la fraude et les abus, corriger les erreurs.",
  "privacy.purposes.li5": "Respecter nos obligations légales (fiscales et comptables, notamment).",
  "privacy.purposes.li6": "Te transmettre des messages importants sur le service (changement de conditions, incident de sécurité). Nous ne t'enverrons pas d'infolettre promotionnelle sans ton consentement.",
  "privacy.purposes.p1":
    "Nous utilisons tes renseignements sur la base de ton consentement, de l'exécution du contrat qui nous lie (les conditions d'utilisation), de nos obligations légales et de notre intérêt légitime à sécuriser le service. Tu peux retirer ton consentement en tout temps, ce qui peut toutefois empêcher l'utilisation de certaines fonctions.",

  "privacy.ai.h": "Intelligence artificielle",
  "privacy.ai.p1":
    "Certaines fonctions utilisent un modèle d'IA (Claude, fourni par Anthropic) : rédaction de lettres, estimation fiscale et traduction automatique de l'interface dans les langues autres que le français et l'anglais.",
  "privacy.ai.li1": "L'IA n'est utilisée que lorsque tu lances une de ces fonctions, à l'exception de la traduction de l'interface, qui ne contient aucune donnée personnelle.",
  "privacy.ai.li2": "Nous transmettons seulement les informations nécessaires à la tâche demandée (par exemple, les champs de ta lettre ou les montants de ton estimation), jamais l'ensemble de ton compte ni tes documents téléversés.",
  "privacy.ai.li3": "Selon les conditions du fournisseur (à vérifier), les données envoyées par l'API ne sont pas utilisées pour entraîner ses modèles et sont conservées pour une durée limitée à des fins de sécurité.",
  "privacy.ai.li4": "Les résultats de l'IA peuvent contenir des erreurs. Aucune décision te concernant n'est prise de façon entièrement automatisée par Kettlebill.",

  "privacy.sharing.h": "Fournisseurs et hébergement hors du Québec",
  "privacy.sharing.p1":
    "Pour exploiter Kettlebill, nous faisons appel à des sous-traitants qui traitent des renseignements pour notre compte, selon nos instructions et en vertu d'ententes contractuelles qui exigent des mesures de protection adéquates :",
  "privacy.sharing.li1": "Supabase — base de données, authentification et stockage des fichiers (région d'hébergement : [à compléter, ex. Canada ou États-Unis]).",
  "privacy.sharing.li2": "Vercel — hébergement de l'application web (États-Unis et réseau mondial).",
  "privacy.sharing.li3": "Stripe — paiements et facturation (États-Unis et autres pays).",
  "privacy.sharing.li4": "Anthropic — fonctions d'intelligence artificielle (États-Unis).",
  "privacy.sharing.li5": "Resend — envoi des courriels de rappel et de compte (États-Unis).",
  "privacy.sharing.p2":
    "Ces fournisseurs peuvent stocker ou traiter des renseignements à l'extérieur du Québec et du Canada, principalement aux États-Unis, où ils peuvent être soumis aux lois locales. Avant de communiquer des renseignements à l'extérieur du Québec, nous évaluons les facteurs relatifs à la vie privée et nous nous assurons que la protection offerte est adéquate, comme l'exige la Loi 25.",
  "privacy.sharing.p3":
    "Nous ne communiquons tes renseignements à aucun autre tiers, sauf si la loi l'exige (par exemple, une ordonnance d'un tribunal) ou avec ton consentement. Les membres d'un espace partagé voient le contenu de cet espace, mais jamais celui de ton espace personnel.",

  "privacy.retention.h": "Conservation",
  "privacy.retention.li1": "Tant que ton compte est actif, nous conservons tes données pour te fournir le service.",
  "privacy.retention.li2": "Quand tu supprimes ton compte, tes données et tes fichiers sont supprimés de la base active dans un délai de [30 jours — à confirmer], puis disparaissent des copies de sauvegarde selon leur cycle de rotation (au plus [90 jours — à confirmer]).",
  "privacy.retention.li3": "Les données de facturation sont conservées le temps exigé par les lois fiscales (en général six ans).",
  "privacy.retention.li4": "Les journaux techniques sont conservés au plus [90 jours — à confirmer], sauf en cas d'enquête de sécurité.",

  "privacy.security.h": "Sécurité",
  "privacy.security.li1": "Chiffrement de toutes les communications (HTTPS/TLS) et chiffrement des données au repos par nos fournisseurs.",
  "privacy.security.li2": "Sécurité au niveau des lignes (RLS) dans la base de données : chaque requête est filtrée selon ton identité et les espaces dont tu es membre.",
  "privacy.security.li3": "Documents stockés dans un espace privé, accessibles seulement par des liens signés et temporaires.",
  "privacy.security.li4": "Accès interne limité au strict nécessaire, clés secrètes conservées uniquement côté serveur.",
  "privacy.security.p1":
    "Aucun système n'est infaillible. En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous t'avisons, ainsi que la Commission d'accès à l'information, avec diligence, et nous tenons un registre des incidents.",

  "privacy.rights.h": "Tes droits",
  "privacy.rights.p1": "Tu peux en tout temps :",
  "privacy.rights.li1": "Accéder à tes renseignements personnels et savoir comment ils sont utilisés.",
  "privacy.rights.li2": "Les faire rectifier s'ils sont inexacts, incomplets ou équivoques — la plupart se modifient directement dans l'application.",
  "privacy.rights.li3": "Obtenir une copie de tes données dans un format technologique structuré et couramment utilisé (portabilité), grâce à l'exportation dans Réglages.",
  "privacy.rights.li4": "Faire supprimer tes données en supprimant ton compte dans Réglages.",
  "privacy.rights.li5": "Retirer ton consentement à un traitement, ou demander la cessation de la diffusion ou la désindexation de renseignements te concernant lorsque la loi le permet.",
  "privacy.rights.li6": "Porter plainte auprès de la Commission d'accès à l'information du Québec (cai.gouv.qc.ca), du Commissariat à la protection de la vie privée du Canada, ou de l'autorité de protection des données de ton pays si tu résides en Europe.",
  "privacy.rights.p2":
    "Pour exercer un droit qui ne se règle pas directement dans l'application, écris à la personne responsable indiquée plus haut. Nous pourrions te demander de confirmer ton identité.",

  "privacy.cookies.h": "Témoins (cookies)",
  "privacy.cookies.p1": "Kettlebill utilise uniquement des témoins essentiels au fonctionnement du service, sans publicité ni mesure d'audience par des tiers :",
  "privacy.cookies.li1": "Session : garder ta connexion active de façon sécuritaire.",
  "privacy.cookies.li2": "Langue : retenir la langue choisie.",
  "privacy.cookies.li3": "Thème : retenir l'affichage clair ou sombre.",
  "privacy.cookies.li4": "Espace courant : retenir l'espace (personnel, famille ou entreprise) que tu consultes.",
  "privacy.cookies.p2": "Lors du paiement, Stripe peut déposer ses propres témoins sur ses pages, selon sa politique de confidentialité.",

  "privacy.minors.h": "Mineurs",
  "privacy.minors.p1":
    "Kettlebill s'adresse aux adultes. Il est interdit de créer un compte si tu as moins de 14 ans ; entre 14 et la majorité, l'accord d'un parent ou tuteur est recommandé. Si tu crois qu'un enfant de moins de 14 ans nous a fourni des renseignements, écris-nous et nous les supprimerons.",

  "privacy.changes.h": "Modifications",
  "privacy.changes.p1":
    "Nous pouvons modifier cette politique pour suivre l'évolution du service ou de la loi. En cas de changement important, nous t'avisons par courriel ou dans l'application avant son entrée en vigueur. La date de dernière mise à jour figure en haut de la page.",

  "privacy.contact.h": "Nous joindre",
  "privacy.contact.p1":
    "[Nom du responsable — à compléter], responsable de la protection des renseignements personnels — [adresse courriel de contact — à compléter] — [adresse postale — à compléter].",

  // ---------------------------------------------------------------- Conditions d'utilisation
  "terms.metaTitle": "Conditions d'utilisation",
  "terms.metaDescription": "Les règles qui encadrent l'utilisation de Kettlebill : compte, forfaits, essai gratuit, résiliation, IA et responsabilité.",
  "terms.title": "Conditions d'utilisation",
  "terms.intro":
    "Ces conditions forment le contrat entre toi et [Nom de l'entreprise — à compléter] (« Kettlebill », « nous ») pour l'utilisation du service Kettlebill. En créant un compte, tu les acceptes. Lis-les attentivement ; nous les avons voulues aussi claires que possible.",

  "terms.service.h": "Le service",
  "terms.service.p1":
    "Kettlebill est une application web qui t'aide à organiser ta vie administrative et ton budget : échéances et rappels, budget et rapports, abonnements, coffre à documents, lettres types et estimations fiscales générées par l'IA. Le service peut évoluer ; nous pouvons ajouter, modifier ou retirer des fonctions, en t'avisant d'un changement important.",

  "terms.account.h": "Ton compte",
  "terms.account.li1": "Tu dois avoir au moins 14 ans et fournir des renseignements exacts.",
  "terms.account.li2": "Tu es responsable de la confidentialité de ton mot de passe et des activités faites avec ton compte. Avise-nous sans délai de toute utilisation non autorisée.",
  "terms.account.li3": "Dans un espace partagé, le propriétaire de l'espace décide qui y est invité. Les membres peuvent voir et modifier le contenu de l'espace.",
  "terms.account.li4": "Tu peux supprimer ton compte en tout temps dans Réglages.",

  "terms.plans.h": "Forfaits, essai gratuit et renouvellement",
  "terms.plans.li1": "Le forfait Gratuit est offert sans frais, avec les limites décrites sur la page des forfaits.",
  "terms.plans.li2": "Les forfaits payants (Individuel, Famille et entreprise) sont facturés au mois ou à l'année, à l'avance, par l'intermédiaire de Stripe.",
  "terms.plans.li3": "Un essai gratuit de 14 jours est offert lors du premier abonnement à un forfait payant. Si tu n'annules pas avant la fin de l'essai, l'abonnement commence et le premier paiement est prélevé. Nous te rappelons la fin de l'essai par courriel.",
  "terms.plans.li4": "L'abonnement se renouvelle automatiquement à la fin de chaque période, au prix alors en vigueur. Nous t'avisons au moins 30 jours à l'avance de toute hausse de prix.",
  "terms.plans.li5": "Si un paiement échoue, nous pouvons suspendre les fonctions payantes et ramener ton compte au forfait Gratuit ; tes données ne sont pas supprimées pour autant.",

  "terms.cancel.h": "Résiliation et remboursements",
  "terms.cancel.p1":
    "Tu peux annuler ton abonnement en tout temps dans Réglages, sans frais de résiliation. L'accès au forfait payant se poursuit jusqu'à la fin de la période déjà payée, puis ton compte revient au forfait Gratuit.",
  "terms.cancel.p2": "[Politique de remboursement — à compléter (ex. remboursement au prorata, délai de demande).]",
  "terms.cancel.p3":
    "Nous pouvons suspendre ou fermer un compte qui enfreint gravement ces conditions, après t'en avoir avisé lorsque c'est possible. Tu pourras alors exporter tes données, sauf si la loi l'interdit.",

  "terms.taxes.h": "Prix et taxes",
  "terms.taxes.p1":
    "Les prix sont indiqués en dollars canadiens, taxes en sus. La TPS, la TVQ ou toute autre taxe de vente applicable selon ton lieu de résidence s'ajoutent au moment du paiement.",

  "terms.use.h": "Utilisation acceptable",
  "terms.use.p1": "Tu t'engages à ne pas :",
  "terms.use.li1": "utiliser Kettlebill à des fins illégales, frauduleuses ou pour harceler quelqu'un ;",
  "terms.use.li2": "téléverser du contenu illicite, des logiciels malveillants ou des documents dont tu n'as pas le droit de disposer ;",
  "terms.use.li3": "tenter d'accéder aux données d'autres utilisateurs, de contourner les limites des forfaits ou de perturber le service ;",
  "terms.use.li4": "revendre ou exploiter commercialement le service sans notre accord écrit.",

  "terms.ai.h": "Estimations et contenus générés par l'IA",
  "terms.ai.p1":
    "Les estimations fiscales, lettres et autres contenus générés par l'IA sont fournis à titre informatif seulement. Ils peuvent être incomplets ou inexacts et ne constituent pas un avis fiscal, juridique, comptable ou financier. Vérifie toujours le résultat avant de t'en servir, et consulte un professionnel qualifié (comptable, fiscaliste, avocat, notaire) pour toute décision importante.",

  "terms.content.h": "Ton contenu",
  "terms.content.p1":
    "Tu demeures propriétaire de tout ce que tu ajoutes à Kettlebill. Tu nous accordes seulement le droit de l'héberger, de le traiter et de l'afficher dans le but de te fournir le service. Tu peux l'exporter ou le supprimer en tout temps. Le traitement de tes renseignements personnels est décrit dans la politique de confidentialité.",

  "terms.ip.h": "Propriété intellectuelle",
  "terms.ip.p1":
    "Le logiciel, la marque Kettlebill, le logo et les modèles de lettres nous appartiennent. Tu peux utiliser les lettres générées pour tes besoins personnels ou ceux de ton entreprise.",

  "terms.liability.h": "Responsabilité",
  "terms.liability.p1":
    "Nous faisons de notre mieux pour que Kettlebill soit fiable et disponible, mais le service est fourni « tel quel ». Nous ne garantissons pas qu'il sera exempt d'interruptions ou d'erreurs, ni qu'un rappel sera toujours reçu (filtres anti-pourriel, panne d'un fournisseur). Tu restes responsable de payer tes factures et de respecter tes échéances.",
  "terms.liability.p2":
    "Dans la mesure permise par la loi, notre responsabilité totale est limitée au montant que tu nous as payé au cours des 12 derniers mois, et nous ne sommes pas responsables des dommages indirects. Rien dans ces conditions ne limite les droits que t'accorde la Loi sur la protection du consommateur du Québec ou toute autre loi d'ordre public applicable.",

  "terms.changes.h": "Modifications des conditions",
  "terms.changes.p1":
    "Nous pouvons modifier ces conditions. Nous t'avisons par courriel au moins 30 jours avant l'entrée en vigueur d'un changement important, en indiquant la nouvelle version et la date d'entrée en vigueur. Si tu refuses la modification, tu peux résilier sans frais ni pénalité.",

  "terms.law.h": "Droit applicable et tribunaux",
  "terms.law.p1":
    "Ces conditions sont régies par les lois du Québec et les lois du Canada qui s'y appliquent. Tout litige relève des tribunaux du Québec, district judiciaire de [à compléter], sous réserve des droits que la loi accorde aux consommateurs de s'adresser au tribunal de leur domicile.",
  "terms.law.p2": "Ces conditions sont rédigées en français. Une traduction peut être offerte ; en cas de divergence, la version française prévaut.",

  "terms.contact.h": "Nous joindre",
  "terms.contact.p1": "[Nom de l'entreprise — à compléter] — [adresse courriel de contact — à compléter] — [adresse postale — à compléter].",
};
const en: Partial<Record<keyof typeof fr, string>> = {
  "title": "Legal",
  "draft": "Draft — to be reviewed by a lawyer before going live.",
  "updated": "Last updated: {date}",
  "updatedPlaceholder": "[date to be completed]",
  "toc": "On this page",
  "frenchPrevails": "If the versions differ, the French version prevails.",
  "nav.privacy": "Privacy policy",
  "nav.terms": "Terms of service",

  "privacy.metaTitle": "Privacy policy",
  "privacy.metaDescription":
    "How Kettlebill collects, uses, protects and retains your personal information, and how to exercise your rights.",
  "privacy.title": "Privacy policy",
  "privacy.intro":
    "Your life admin is personal. This policy explains, in plain words, what information Kettlebill collects, why, who it's shared with, how long it's kept and how you can exercise your rights. It aims to comply with Québec's Act respecting the protection of personal information in the private sector (Law 25), Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) and, for people located in Europe, the principles of the General Data Protection Regulation (GDPR).",

  "privacy.who.h": "Who we are",
  "privacy.who.p1":
    "Kettlebill is an online life-admin and budgeting service operated by [Company name — to be completed], located at [address — to be completed], Québec, Canada (“Kettlebill”, “we”).",

  "privacy.officer.h": "Person in charge of the protection of personal information",
  "privacy.officer.p1":
    "The person in charge of the protection of personal information at Kettlebill is: [Name of the person in charge — to be completed], [title — to be completed].",
  "privacy.officer.p2":
    "For any question, access request or complaint about your personal information, write to: [contact email — to be completed]. We reply in writing within 30 days.",

  "privacy.data.h": "Information we collect",
  "privacy.data.p1": "We only collect what's needed to run the service:",
  "privacy.data.li1": "Account: name, email address, password (stored hashed by our authentication provider — we never see it), language, country, region, currency and display preferences.",
  "privacy.data.li2": "Content you add: due dates, transactions and budgets, subscriptions, uploaded documents and their metadata (title, category, expiry date), letters, tax estimates and the data you enter to get them (income, family situation, etc.).",
  "privacy.data.li3": "Shared spaces: the people you invite to a family or business space (email address) and their role.",
  "privacy.data.li4": "Billing: plan, subscription status and Stripe customer identifiers. Card numbers are handled directly by Stripe; we never receive them.",
  "privacy.data.li5": "Technical data: sign-in and error logs (IP address, browser type, date and time) and AI usage counters, needed for security and to enforce plan limits.",
  "privacy.data.p2":
    "We don't sell your personal information, we don't show ads and we don't use advertising trackers. No profiling feature is enabled.",

  "privacy.purposes.h": "Why we use it",
  "privacy.purposes.li1": "To provide the service: show your data, compute your budget, send the email reminders you turned on.",
  "privacy.purposes.li2": "To manage your account, subscription, free trial and billing.",
  "privacy.purposes.li3": "To run the AI features you request (letters, tax estimate, interface translation).",
  "privacy.purposes.li4": "To keep the service secure, prevent fraud and abuse, and fix bugs.",
  "privacy.purposes.li5": "To meet our legal obligations (tax and accounting, in particular).",
  "privacy.purposes.li6": "To send you important service messages (changes to the terms, security incidents). We won't send you promotional newsletters without your consent.",
  "privacy.purposes.p1":
    "We use your information based on your consent, the performance of our contract with you (the terms of service), our legal obligations and our legitimate interest in keeping the service secure. You can withdraw your consent at any time, although this may prevent some features from working.",

  "privacy.ai.h": "Artificial intelligence",
  "privacy.ai.p1":
    "Some features use an AI model (Claude, provided by Anthropic): letter drafting, tax estimates and automatic translation of the interface into languages other than French and English.",
  "privacy.ai.li1": "AI only runs when you start one of these features, except interface translation, which contains no personal data.",
  "privacy.ai.li2": "We only send the information needed for the requested task (for example, the fields of your letter or the amounts in your estimate), never your whole account or your uploaded documents.",
  "privacy.ai.li3": "According to the provider's terms (to be verified), data sent through the API isn't used to train its models and is retained for a limited time for safety purposes.",
  "privacy.ai.li4": "AI output may contain errors. Kettlebill makes no decision about you based solely on automated processing.",

  "privacy.sharing.h": "Service providers and hosting outside Québec",
  "privacy.sharing.p1":
    "To run Kettlebill, we use processors that handle information on our behalf, following our instructions and under contracts requiring adequate safeguards:",
  "privacy.sharing.li1": "Supabase — database, authentication and file storage (hosting region: [to be completed, e.g. Canada or United States]).",
  "privacy.sharing.li2": "Vercel — web application hosting (United States and global network).",
  "privacy.sharing.li3": "Stripe — payments and billing (United States and other countries).",
  "privacy.sharing.li4": "Anthropic — artificial intelligence features (United States).",
  "privacy.sharing.li5": "Resend — reminder and account emails (United States).",
  "privacy.sharing.p2":
    "These providers may store or process information outside Québec and Canada, mostly in the United States, where it may be subject to local laws. Before communicating information outside Québec, we assess the privacy-related factors and make sure the protection offered is adequate, as required by Law 25.",
  "privacy.sharing.p3":
    "We don't share your information with any other third party, unless required by law (for example, a court order) or with your consent. Members of a shared space can see that space's content, but never your personal space.",

  "privacy.retention.h": "Retention",
  "privacy.retention.li1": "As long as your account is active, we keep your data to provide the service.",
  "privacy.retention.li2": "When you delete your account, your data and files are removed from the live database within [30 days — to be confirmed], then disappear from backups according to their rotation cycle (at most [90 days — to be confirmed]).",
  "privacy.retention.li3": "Billing records are kept for as long as tax laws require (generally six years).",
  "privacy.retention.li4": "Technical logs are kept for at most [90 days — to be confirmed], except during a security investigation.",

  "privacy.security.h": "Security",
  "privacy.security.li1": "Encryption of all traffic (HTTPS/TLS) and encryption of data at rest by our providers.",
  "privacy.security.li2": "Row-level security (RLS) in the database: every query is filtered by your identity and the spaces you belong to.",
  "privacy.security.li3": "Documents stored in a private bucket, reachable only through signed, short-lived links.",
  "privacy.security.li4": "Internal access limited to what's strictly necessary; secret keys kept on the server only.",
  "privacy.security.p1":
    "No system is foolproof. If a confidentiality incident poses a risk of serious injury, we promptly notify you and the Commission d'accès à l'information, and we keep a register of incidents.",

  "privacy.rights.h": "Your rights",
  "privacy.rights.p1": "At any time, you can:",
  "privacy.rights.li1": "Access your personal information and find out how it's used.",
  "privacy.rights.li2": "Have it corrected if it's inaccurate, incomplete or ambiguous — most of it can be edited directly in the app.",
  "privacy.rights.li3": "Get a copy of your data in a structured, commonly used technological format (portability), using the export in Settings.",
  "privacy.rights.li4": "Have your data deleted by deleting your account in Settings.",
  "privacy.rights.li5": "Withdraw your consent to a processing activity, or ask that information about you stop being disseminated or be de-indexed where the law allows.",
  "privacy.rights.li6": "File a complaint with Québec's Commission d'accès à l'information (cai.gouv.qc.ca), the Office of the Privacy Commissioner of Canada, or your country's data protection authority if you live in Europe.",
  "privacy.rights.p2":
    "To exercise a right that can't be handled directly in the app, write to the person in charge named above. We may ask you to confirm your identity.",

  "privacy.cookies.h": "Cookies",
  "privacy.cookies.p1": "Kettlebill only uses cookies that are essential to the service, with no advertising or third-party analytics:",
  "privacy.cookies.li1": "Session: keep you securely signed in.",
  "privacy.cookies.li2": "Language: remember the language you chose.",
  "privacy.cookies.li3": "Theme: remember light or dark mode.",
  "privacy.cookies.li4": "Current space: remember which space (personal, family or business) you're viewing.",
  "privacy.cookies.p2": "During checkout, Stripe may set its own cookies on its pages, according to its privacy policy.",

  "privacy.minors.h": "Minors",
  "privacy.minors.p1":
    "Kettlebill is meant for adults. You may not create an account if you are under 14; between 14 and the age of majority, a parent's or guardian's agreement is recommended. If you believe a child under 14 has given us information, write to us and we'll delete it.",

  "privacy.changes.h": "Changes",
  "privacy.changes.p1":
    "We may update this policy as the service or the law evolves. For any significant change, we'll notify you by email or in the app before it takes effect. The last-updated date appears at the top of this page.",

  "privacy.contact.h": "Contact us",
  "privacy.contact.p1":
    "[Name of the person in charge — to be completed], person in charge of the protection of personal information — [contact email — to be completed] — [mailing address — to be completed].",

  "terms.metaTitle": "Terms of service",
  "terms.metaDescription": "The rules for using Kettlebill: account, plans, free trial, cancellation, AI and liability.",
  "terms.title": "Terms of service",
  "terms.intro":
    "These terms form the contract between you and [Company name — to be completed] (“Kettlebill”, “we”) for the use of the Kettlebill service. By creating an account, you accept them. Please read them carefully; we tried to make them as clear as possible.",

  "terms.service.h": "The service",
  "terms.service.p1":
    "Kettlebill is a web app that helps you organize your life admin and budget: due dates and reminders, budget and reports, subscriptions, document vault, letter templates and AI-generated tax estimates. The service may evolve; we may add, change or remove features, and we'll notify you of any significant change.",

  "terms.account.h": "Your account",
  "terms.account.li1": "You must be at least 14 years old and provide accurate information.",
  "terms.account.li2": "You're responsible for keeping your password confidential and for activity on your account. Tell us right away about any unauthorized use.",
  "terms.account.li3": "In a shared space, the space owner decides who is invited. Members can see and edit the space's content.",
  "terms.account.li4": "You can delete your account at any time in Settings.",

  "terms.plans.h": "Plans, free trial and renewal",
  "terms.plans.li1": "The Free plan is offered at no cost, with the limits described on the pricing page.",
  "terms.plans.li2": "Paid plans (Individual, Family & business) are billed monthly or yearly, in advance, through Stripe.",
  "terms.plans.li3": "A 14-day free trial is offered with your first paid subscription. If you don't cancel before the trial ends, the subscription starts and the first payment is charged. We'll remind you by email before the trial ends.",
  "terms.plans.li4": "Your subscription renews automatically at the end of each period, at the then-current price. We'll notify you at least 30 days in advance of any price increase.",
  "terms.plans.li5": "If a payment fails, we may suspend paid features and move your account back to the Free plan; your data isn't deleted.",

  "terms.cancel.h": "Cancellation and refunds",
  "terms.cancel.p1":
    "You can cancel your subscription at any time in Settings, with no cancellation fee. Your paid plan stays active until the end of the period already paid, then your account returns to the Free plan.",
  "terms.cancel.p2": "[Refund policy — to be completed (e.g. prorated refunds, request deadline).]",
  "terms.cancel.p3":
    "We may suspend or close an account that seriously breaches these terms, with notice where possible. You'll then be able to export your data, unless the law forbids it.",

  "terms.taxes.h": "Prices and taxes",
  "terms.taxes.p1":
    "Prices are shown in Canadian dollars, plus applicable taxes. GST, QST or any other sales tax applicable where you live is added at checkout.",

  "terms.use.h": "Acceptable use",
  "terms.use.p1": "You agree not to:",
  "terms.use.li1": "use Kettlebill for illegal or fraudulent purposes, or to harass anyone;",
  "terms.use.li2": "upload unlawful content, malware or documents you have no right to use;",
  "terms.use.li3": "try to access other users' data, bypass plan limits or disrupt the service;",
  "terms.use.li4": "resell or commercially exploit the service without our written consent.",

  "terms.ai.h": "AI-generated estimates and content",
  "terms.ai.p1":
    "Tax estimates, letters and other AI-generated content are provided for information only. They may be incomplete or inaccurate and are not tax, legal, accounting or financial advice. Always review the output before using it, and consult a qualified professional (accountant, tax professional, lawyer, notary) for any important decision.",

  "terms.content.h": "Your content",
  "terms.content.p1":
    "You remain the owner of everything you add to Kettlebill. You only grant us the right to host, process and display it in order to provide the service to you. You can export or delete it at any time. How we handle your personal information is described in the privacy policy.",

  "terms.ip.h": "Intellectual property",
  "terms.ip.p1":
    "The software, the Kettlebill brand, the logo and the letter templates belong to us. You may use generated letters for your personal or business needs.",

  "terms.liability.h": "Liability",
  "terms.liability.p1":
    "We do our best to keep Kettlebill reliable and available, but the service is provided “as is”. We don't guarantee it will be free of interruptions or errors, or that a reminder will always arrive (spam filters, provider outages). You remain responsible for paying your bills and meeting your deadlines.",
  "terms.liability.p2":
    "To the extent permitted by law, our total liability is limited to the amount you paid us in the last 12 months, and we're not liable for indirect damages. Nothing in these terms limits your rights under Québec's Consumer Protection Act or any other applicable mandatory law.",

  "terms.changes.h": "Changes to the terms",
  "terms.changes.p1":
    "We may change these terms. We'll email you at least 30 days before a significant change takes effect, with the new version and its effective date. If you refuse the change, you can cancel at no cost or penalty.",

  "terms.law.h": "Governing law and courts",
  "terms.law.p1":
    "These terms are governed by the laws of Québec and the federal laws of Canada that apply there. Any dispute falls under the courts of Québec, judicial district of [to be completed], subject to consumers' legal right to bring a claim before the court of their domicile.",
  "terms.law.p2": "These terms are written in French. A translation may be provided; if the versions differ, the French version prevails.",

  "terms.contact.h": "Contact us",
  "terms.contact.p1": "[Company name — to be completed] — [contact email — to be completed] — [mailing address — to be completed].",
};
const pack = { fr, en };
export default pack;
