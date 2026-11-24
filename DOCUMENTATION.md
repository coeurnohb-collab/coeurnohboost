# Coeurnoh Universe — Documentation complète

Coeurnoh Universe est une plateforme multiservices (réseaux sociaux, sites web, entreprises, factures, emploi, académie, immobilier, voyages, réservations, événements, concours, alertes, boutique, portefeuille). Elle fonctionne comme une application installable sur téléphone (PWA), sur https://coeurnohuniverse.com/.

> **Un seul fichier.** Ce document regroupe toutes les notes du projet. Il remplace les anciens fichiers séparés du dossier `docs/` (`README.md`, `ARCHITECTURE.md`, `INSTALLATION-DEPLOIEMENT.md`, `DESIGN-SYSTEM.md`, `SECURITE.md`, `PERFORMANCE.md`, `AUDIT-ET-MATRICE.md`, `TESTS.md`, `A-CONFIGURER.md`, `FEUILLE-DE-ROUTE.md`). Ces notes ne servent qu'à lire et à se souvenir : l'application ne les utilise jamais.

## Sommaire

| Partie | À quoi elle sert |
|---|---|
| [Partie 1 : Les 5 règles qu'on ne casse jamais](#partie-1--les-5-règles-quon-ne-casse-jamais) | Les règles de base à ne jamais enfreindre. |
| [Partie 2 : Installation et déploiement](#partie-2--installation-et-déploiement) | Comment mettre à jour l'application et vérifier qu'elle marche. |
| [Partie 3 : Éléments extérieurs à configurer](#partie-3--éléments-extérieurs-à-configurer) | Les éléments qui dépendent de comptes extérieurs (clés, règles Firestore, facturation Firebase). |
| [Partie 4 : Feuille de route](#partie-4--feuille-de-route) | Ce qui reste à construire, dans l'ordre conseillé. |
| [Partie 5 : Audit et matrice](#partie-5--audit-et-matrice) | Le grand prompt, partie par partie : ce qui est fait, partiel ou à faire, et le tableau de tous les services. |
| [Partie 6 : Sécurité](#partie-6--sécurité) | Ce qui protège l'application, les failles trouvées et corrigées, les risques qui restent. |
| [Partie 7 : Architecture](#partie-7--architecture) | Comment l'application est construite : pages, fonctions serveur, base de données, argent. |
| [Partie 8 : Tests](#partie-8--tests) | Les tests réellement exécutés, ce qu'ils vérifient et ce qu'ils ne vérifient pas. |
| [Partie 9 : Performance](#partie-9--performance) | Les poids et les temps mesurés, et les améliorations possibles. |
| [Partie 10 : Design System](#partie-10--design-system) | Les couleurs, icônes et règles visuelles officielles de la marque. |

---

## Partie 1 : Les 5 règles qu'on ne casse jamais

1. **L'argent se calcule et s'écrit côté serveur**, dans une transaction, avec une ligne dans le relevé `wallet_transactions`. Jamais depuis le navigateur.
2. **Un paiement est « réussi » seulement après confirmation du fournisseur** (signature de la notification, puis revérification auprès du fournisseur).
3. **Aucun numéro de carte n'est stocké ni affiché** par l'application.
4. **`app.min.js`, `app.min.css` et `index.html` vont toujours ensemble** et ne se modifient jamais à la main : on lance `node tools/build.js` (aussi après avoir corrigé un texte dans un fichier de langue `lang-xx.js`).
5. **Vercel gratuit : 12 fonctions maximum** dans `api/` (déjà 12). Une nouvelle fonction se range dans une fonction existante.

---

## Partie 2 : Installation et déploiement

### Mettre à jour l'application (méthode habituelle, depuis le téléphone)

1. Dépose les fichiers reçus dans le dépôt GitHub **`main`**, chacun dans son dossier : à la racine (à côté de `script.js`), dans `api/`, dans `api/_lib/`, dans `tests/`, dans `docs/` (pour les notes, un seul fichier : `DOCUMENTATION.md`).
2. Vercel redéploie tout seul. Attends que le déploiement soit terminé (statut « Ready »).
3. **Ouvre l'application 2 fois** (la 1re fois elle télécharge la nouvelle version, la 2e l'active). Fais pareil pour la **page admin**.
4. Contrôle rapide : ouvre le menu → Portefeuille, puis l'admin → onglet Bénéfices → « Générer le rapport ».

> `index.html`, `app.min.js` et `app.min.css` se déposent **toujours ensemble**. Si un fichier de langue `lang-xx.js` a changé, `index.html` change aussi (son numéro de version) : on dépose les quatre ensemble.

> Les **nouveaux fichiers à la racine** de cette version : `lang-en.js`, `lang-es.js`, `lang-it.js`, `lang-pt.js`, `lang-de.js`, `lang-sw.js`, `lang-ln.js`, `admin-profit.js`, `admin-availability.js`. Ils se déposent à côté de `script.js`, comme les autres.

### Vérifier le projet sur un ordinateur (si tu en as un)

Prérequis : Node.js 20 ou plus (le contrôle automatique GitHub utilise Node 22). Aucune dépendance à installer pour les tests.

```
node tools/build.js           # reconstruit app.min.js, app.min.css et les empreintes de index.html (y compris celles des fichiers de langue lang-xx.js)
node tools/build.js --check   # vérifie que tout est à jour (échoue sinon)
node --test tests/*.test.js   # lance tous les tests (479 au dernier contrôle)
```

La vérification se lance aussi toute seule sur GitHub à chaque dépôt (fichier `ci.yml`, qui doit être rangé dans `.github/workflows/` pour être actif).

### À chaque livraison, on change les numéros de version

- `CACHE_NAME` dans `sw.js` (ex. `coeurnohboost-v42`) ;
- le numéro `V` dans `stability.js` et les `?v=` dans `auth-guard.js`, `menu-pro.js`, `messaging-pro.js`, `script.js`, `admin.html` ;
- le test `tests/admin-icons.test.js` qui vérifie ces numéros.

Sans cela, les téléphones gardent l'ancienne version en mémoire.

### Premier déploiement (nouvelle installation)

1. Créer un projet **Firebase** (Authentication : e-mail + Google ; Firestore).
2. Créer un projet **Vercel** relié au dépôt GitHub (branche `main`).
3. Ajouter les **variables d'environnement** listées dans [la partie « Éléments extérieurs à configurer »](#partie-3--éléments-extérieurs-à-configurer).
4. Coller les **règles Firestore** (par petits morceaux, jamais en fichier) et publier.
5. Déclarer le domaine `coeurnohuniverse.com` dans Vercel.
6. Déclarer chez chaque fournisseur de paiement l'adresse de notification : `https://coeurnohuniverse.com/api/payment-webhook?provider=<nom>` (`saspay`, `cryptomus`, `mbotepay`, `optgateway`).

### Retour en arrière

- **Code** : dans Vercel → Deployments → choisir la version précédente → « Promote to Production ». C'est immédiat.
- **Données** : l'admin peut exporter une sauvegarde par collection (onglet « Exploitation : assistance, sauvegarde, journal » de l'admin, fourni par `care.js`). Pour des sauvegardes automatiques complètes de Firestore, il faut la formule Firebase **Blaze** (voir [la partie « Éléments extérieurs à configurer »](#partie-3--éléments-extérieurs-à-configurer)).

---

## Partie 3 : Éléments extérieurs à configurer

Tout ce qui dépend d'un compte chez un fournisseur (clés, secrets, facturation) ne peut pas être fait dans le code. Voici la liste complète, relevée dans le code. Les clés se collent dans **Vercel → Settings → Environment Variables** (jamais dans un fichier du dépôt), puis on redéploie.

### 1. Variables d'environnement Vercel

#### Indispensables

| Variable | À quoi elle sert |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Compte de service Firebase : permet au serveur de lire et écrire Firestore. |
| `CRON_SECRET` | Protège les 2 tâches automatiques (6 h et 8 h) : sans lui, n'importe qui pourrait les lancer. |

#### Paiements (selon ceux que tu utilises)

| Fournisseur | Variables | Adresse à déclarer chez le fournisseur |
|---|---|---|
| **SasPay** (mobile multi-pays) | `SASPAY_API_KEY` (commence par `sk_live_`), `SASPAY_WEBHOOK_SECRET` ; facultatif : `SASPAY_API_BASE` | `https://coeurnohuniverse.com/api/payment-webhook?provider=saspay` |
| **MBotePay** | `MBOTEPAY_API_KEY`, `MBOTEPAY_WEBHOOK_SECRET` | `…/api/payment-webhook?provider=mbotepay` |
| **OPTGateway** | `OPTGATEWAY_API_KEY`, `OPTGATEWAY_WEBHOOK_SECRET` ; facultatif : `OPTGATEWAY_API_BASE` | `…/api/payment-webhook?provider=optgateway` |
| **Cryptomus** (crypto) | `CRYPTOMUS_MERCHANT_ID`, `CRYPTOMUS_PAYMENT_KEY` | `…/api/payment-webhook?provider=cryptomus` |

Notes importantes :
- Une clé SasPay `sk_test_` est **refusée en production** (volontairement). Elle n'est acceptée que si `SASPAY_ALLOW_TEST=1`, à ne jamais mettre en production.
- Le secret du webhook SasPay **ne commence pas** par `sk_`. Le code accepte quand même l'inversion des deux noms.
- Sans secret de webhook, la notification est refusée (c'est voulu).
- **Si les clients ne reçoivent pas la demande de confirmation sur leur téléphone** (la page SasPay reste sur « Payment pushed successfully ») : l'envoi vers l'opérateur est fait par SasPay, pas par l'application. Dans l'admin, onglet **Dépôts** : (1) **Revérifier chez SasPay** affiche, dans « Dernier contrôle », le statut réel du paiement, le réseau choisi et la raison donnée par SasPay ; (2) les boutons **RDC : utiliser SasPay / RDC : utiliser OPTGateway** changent le fournisseur Mobile Money **de la RDC seulement**, en moins d'une minute (champ `mobileMoneyByCountry`, par exemple `{"CD": "optgateway"}`, de `settings/payments_config` ; refusé si la clé du fournisseur est absente de Vercel). Tous les autres pays restent sur SasPay, car OPTGateway ne couvre que la carte et le Mobile Money congolais. Le crédit du solde reste fait uniquement après vérification auprès du fournisseur.

#### Services optionnels

| Variable | Service |
|---|---|
| `MTP_API_KEY` | Fournisseur des commandes de croissance réseaux sociaux (et alerte de solde bas). |
| `WEBPUSH_PRIVATE_KEY`, `WEBPUSH_SUBJECT` | Notifications push. |
| `RESEND_API_KEY`, `ALERT_EMAIL` | E-mails et alertes e-mail à l'administrateur. |
| `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` | Alerte WhatsApp (solde bas, erreurs). |
| `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL` | Maquettes générées par IA ; peut aussi servir à l'Académie. |
| `ANTHROPIC_API_KEY`, `ACADEMY_AI_MODEL`, `ACADEMY_AI_MODEL_GEMINI` | IA de l'Académie (cours, quiz, tuteur). |
| `TOPUP_SEAL_KEY` | Clé du sceau des demandes de recharge ; à défaut, le code utilise la clé privée Firebase. |

### 2. Sécurité Firebase

| Élément | État | Ce qu'il faut faire |
|---|---|---|
| **Règles Firestore** | Déjà en place chez toi. Je ne les ai **jamais vues** (elles ne sont pas dans le dépôt) : je ne peux pas les certifier. | Rien à m'envoyer. Si tu veux un contrôle, je te donne de petits morceaux à coller. |
| **App Check** | Prêt mais **inactif** (`SITE_KEY` vide dans `app-check.js`). | Créer une clé reCAPTCHA v3, la coller dans `app-check.js`, observer quelques jours dans la console Firebase, puis « Appliquer ». |
| **Domaines autorisés** (Authentication) | À vérifier. | `coeurnohuniverse.com` doit y figurer. |

### 3. Choses qui demandent la formule payante Firebase (Blaze)

| Fonction | Pourquoi |
|---|---|
| Connexion **par SMS** réelle | Reportée à ta demande ; Firebase facture l'envoi des SMS. |
| **Sauvegardes automatiques** de Firestore | L'export planifié demande Blaze. En attendant, l'export manuel de l'admin existe. |

#### Moyens de connexion : lequel est gratuit, lequel coûte (prix relevés en novembre 2026)

| Moyen | Coût | Limite de pays | Où on en est |
|---|---|---|---|
| **E-mail + mot de passe** | 0 $ (50 000 utilisateurs actifs par mois gratuits avec Firebase) | Aucune | Déjà en place |
| **Google** | 0 $ (même quota) | Aucune | Déjà en place |
| **Facebook, Microsoft** | Pas d'abonnement à ma connaissance, mais il faut créer une application développeur chez eux et parfois la faire valider (non revérifié ici) | Aucune | Reporté à ta demande |
| **Apple** | 99 $ par an (programme Apple Developer) | Aucune | Reporté à ta demande |
| **SMS (numéro de téléphone)** | Impossible en gratuit : demande la formule Blaze (carte bancaire) ; chaque SMS envoyé est facturé, d'environ 0,01 $ à 0,46 $ selon le pays (source secondaire, à revérifier sur la page Google) ; 10 SMS gratuits par jour pour les essais | Le prix change beaucoup selon le pays | Reporté à ta demande |

Le moins cher : **e-mail et Google (0 $)**, déjà actifs. Le plus cher et le plus variable : le SMS.

### 4. Dépôt GitHub

| Action | Pourquoi |
|---|---|
| Ranger `ci.yml` dans `.github/workflows/ci.yml` | Pour que le contrôle automatique se lance vraiment à chaque dépôt (aujourd'hui il est à la racine, donc inactif). Son titre s'affiche aussi avec des caractères abîmés. |
| Supprimer `immo-travel-pro (1).js` | Doublon non utilisé qui diffère du vrai fichier `immo-travel-pro.js`. |

### 5. Services disponibles par pays (rien à configurer à l'extérieur)

L'administrateur règle les pays fermés dans l'admin, onglet **Tarifs** (carte « Services disponibles par pays »). Le réglage est écrit dans Firestore, `pricing/service_availability`, comme les autres réglages de l'admin (`pricing/auth_methods`, `pricing/site`…) : il utilise **la même permission**. Le pays est lu par le serveur dans les en-têtes de connexion de Vercel : rien à activer.

Si le bouton « Enregistrer » répond « ton compte n'a pas la permission », la règle Firestore de la collection `pricing` n'autorise pas ce document : dis-le-moi, je te donnerai un petit morceau de règle à coller (je ne peux pas le vérifier moi-même, les règles ne sont pas dans le dépôt).

### 6. Essais réels à faire par toi (je ne peux pas les faire)

Un essai en **mode test** chez chaque fournisseur de paiement, puis un petit essai réel : recharge → solde crédité une seule fois → ligne dans le relevé → retrait demandé → marqué payé dans l'admin. Je ne te demande pas d'achat test et je ne simule jamais un paiement.

---

## Partie 4 : Feuille de route

Ce qui reste à construire, **dans l'ordre conseillé**. Chaque point dit pourquoi, ce que ça demande, et le risque.

### Fait dans cette étape

| Chantier | Résultat |
|---|---|
| **Chargement à la demande des langues** | Fait et mesuré : première ouverture −25 % de temps (4G lente), −19 % d'octets ; changement de langue en 0,3 s (voir la partie « Performance »). |
| **Onglet Bénéfices : lecture par période** | Fait : 30 jours par défaut, 3 000 commandes au plus ; « Tout » seulement par choix explicite. |
| **Disponibilité des services par pays** (version prudente) | Fait pour la **Boutique** et le **Boost** : l'admin ferme un service pour des pays (onglet Tarifs) ; le serveur refuse avant tout mouvement d'argent. Voir les limites ci-dessous. |
| **Mesure de performance réelle** | Faite en laboratoire (Chromium, réseau et processeur simulés). Reste à confirmer sur de vrais téléphones. |
| **Logo allégé** | Icône 192 px à la place de 512 px pour l'en-tête : −183 Ko à chaque première ouverture. |

### Ce qui reste, dans l'ordre conseillé

| # | Chantier | Pourquoi | Ce que ça demande | Risque / remarque |
|---|---|---|---|---|
| 1 | **Contrôle des règles Firestore** | Tout le reste de la sécurité s'appuie dessus ; je ne les ai jamais vues. | Relecture par petits morceaux à coller. | Aucun, c'est de la lecture. |
| 2 | **Essais réels des paiements** | Les tests actuels imitent les fournisseurs. | Toi : essai en mode test chez chacun, puis un petit essai réel. | Aucun achat test demandé, aucun paiement simulé. |
| 3 | **Activer App Check** | Empêche les scripts pirates de parler à Firestore. | Clé reCAPTCHA v3 dans `app-check.js`, observation, « Appliquer ». | Appliquer trop tôt peut bloquer de vrais utilisateurs : observer d'abord. |
| 4 | **Ranger `ci.yml` dans `.github/workflows/`** (la cause du rouge n'est pas connue : je n'ai pas pu lire les journaux) et supprimer `immo-travel-pro (1).js` | Le contrôle automatique n'est pas actif ; le doublon prête à confusion. | Déplacer / supprimer deux fichiers sur GitHub ; si c'est rouge, copier le message de l'étape qui échoue. | Très faible. |
| 5 | **Rôles et permissions** (modérateur, comptable, support) | Aujourd'hui un seul administrateur peut tout. Validation à deux pour les gros retraits. | Changement des règles Firestore + serveur + admin. | Élevé : touche l'argent et les règles ; à faire avec tests. |
| 6 | **Services par pays : aller plus loin** | Aujourd'hui seuls Boutique et Boost sont contrôlables, et seulement à l'achat. | (a) Tes décisions : quels services, quels pays. (b) Étendre aux autres achats (domaines, billets, cours…) dans `payments-core.js`. (c) Masquer les boutons dans l'application (pays lu par `GET /api/payment-initiate?geo=1`). | Moyen. Le pays vient de la connexion : un VPN le contourne. |
| 7 | **Polices à l'ouverture** | Polices ≈ 142 Ko (voir la partie « Performance » §6). Le logo et l'image d'accueil ont déjà été allégés (§7). | Moins de graisses de police. | Faible. |
| 8 | **Charger à la demande les modules rarement utiles au démarrage** (`academy-hub.js`, `messaging-pro.js`, `panel-store.js` ≈ 88 Ko) | Ouverture plus rapide. | Les charger à l'ouverture du service. | Moyen : tests de non-régression. |
| 9 | **Tests de bout en bout dans un navigateur** | Rejouer connexion → recharge → achat → retrait. | Environnement relié à Firebase de test (l'environnement actuel ne l'atteint pas). Les mesures navigateur de cette étape remplacent Firebase par un faux objet. | Demande un projet Firebase de test séparé. |
| 10 | **Relecture Allemand / Kiswahili / Lingála** par un locuteur natif | Les 1 864 textes de la page + environ 2 700 à 2 900 textes des écrans internes (2 927 en allemand) (tous les modules : Académie, Centre de localisation, guide, constructeur de site, boutique de domaines, concours, messagerie, panneau, aide…) sont traduits (aide d'une IA, bêta). Les textes **assemblés par morceaux** dans le code (ex. un nom de pays suivi de son indicatif), les messages des **boîtes système** (alert) et les noms de pays donnés par le téléphone ne sont pas traduisibles ainsi. | Une relecture humaine. | — |
| 11 | **8 langues du monde en plus** (arabe, chinois, hindi, allemand, russe, turc, japonais, indonésien…) | Ouverture à d'autres marchés. Chaque langue = 1 864 textes à traduire + vérification ; l'arabe demande aussi la mise en page droite-à-gauche. | Mise en page RTL + traductions (un nouveau pack `lang-xx.js` suffit côté textes). | Élevé pour le visuel. |
| 12 | **Tableau de bord admin : compteurs** | `loadStats` relit `users` et `orders` en entier. | Compteurs agrégés. | Faible. |
| 13 | **Retirer `unsafe-inline` de la CSP** | Meilleure protection contre le XSS. | Sortir les scripts et styles en ligne dans des fichiers. | Moyen : beaucoup de pages touchées. |
| 14 | **Sauvegardes automatiques Firestore** | Aujourd'hui, export manuel seulement. | Firebase **Blaze** + export planifié. | Coût de la formule payante. |
| 15 | **Connexion par SMS, puis Apple / Facebook / Microsoft** | **Reportés à ta demande.** | SMS : Firebase Blaze. | Ne pas démarrer sans ton feu vert. |
| 16 | **Découper `script.js`** par service | Premier chargement plus léger. | Gros chantier de refonte. | Élevé. |
| 17 | **Environnements séparés** (test / production) | Essayer sans toucher aux vrais comptes. | Second projet Firebase + second projet Vercel. | Lié au point 9. |

### Règles pour la suite

- **L'argent d'abord** : tout nouveau mouvement d'argent = transaction serveur + ligne de relevé + test.
- **Pas de nouvelle fonction dans `api/`** (limite Vercel gratuite de 12) : ranger dans une fonction existante.
- **Une livraison = une version** : on change `CACHE_NAME` et les numéros de version, on relance `node tools/build.js`, puis les tests.

---

## Partie 5 : Audit et matrice

Ce document compare le projet au **grand prompt « MASTER PROJECT TRANSFORMATION »** (Parties I à XVII) et dit, sans embellir, ce qui est **fait**, **partiel** ou **à faire**.

> Le fichier du grand prompt reçu s'arrête au milieu d'une phrase dans la **Partie XVIII** (critères de validation finale). Je n'ai donc pas pu la comparer ligne par ligne : les parties I à XVII sont couvertes, la XVIII est incomplète dans le fichier.

### 1. Verdict honnête

- **Argent, paiements, sécurité serveur, automatisation, documentation** : travail réel, vérifié par 479 tests simulés. C'est le point fort.
- **Ce qui n'est pas prouvé** : le fonctionnement avec de **vrais fournisseurs**, dans un **vrai navigateur**, sur de **vrais téléphones**, et les **règles Firestore** (jamais vues). Je ne déclare donc pas ces points « opérationnels ».
- **Ce qui reste à construire** : rôles et permissions, services par pays au-delà de la Boutique et du Boost (et masquage des boutons), tests de bout en bout, arabe / droite-à-gauche. Voir [la partie « Feuille de route »](#partie-4--feuille-de-route).

### 2. Partie par partie

| Partie | Sujet | État | Détail |
|---|---|---|---|
| I | Niveau d'exigence | Fait | Travail mené comme une équipe : audit, correction, tests, documents. |
| II | Protéger l'existant | Fait | Rien de supprimé ; tests anciens conservés et toujours verts ; inventaire dans la partie « Architecture ». Retour en arrière : voir la partie « Installation et déploiement ». |
| III | Identité de marque | Fait | Palette, typographie, ombres, icônes, règle de couleur appliquée ; logo et nom conservés. Voir la partie « Design System ». |
| IV | Expérience de la plateforme | Partiel | Menu, accueil et parcours retravaillés dans les lots précédents ; **pas re-testé sur appareils réels**. |
| V | Chaque service | Partiel | Matrice ci-dessous. Les services touchant l'**argent** sont audités en profondeur ; les autres ont été **lus**, pas réécrits. |
| VI | International | Partiel | 8 langues (toutes complètes sur la page principale ; Allemand, Kiswahili et Lingála traduits avec l'aide d'une IA, à faire relire), **chargées à la demande** (un petit fichier par langue), SasPay multi-pays, devises et taux avec garde-fou, **Boutique et Boost fermables par pays** (réglage admin, contrôle serveur). **Manque** : les autres services par pays, le masquage des boutons dans l'application, arabe / droite-à-gauche. |
| VII | Architecture | Partiel | Serveur structuré, transactions, limites Vercel respectées, CI, **langues chargées à la demande** (−25 % de temps d'ouverture mesuré en 4G lente). **Manque** : environnements test/production séparés, sauvegardes automatiques (Blaze), découpage du gros `script.js`. |
| VIII | Finance et paiements | Fait (en tests simulés) | Signatures, idempotence, doublons, échecs, files en attente, remboursements, relevé, rapprochement, rapport CSV. **Pas de test sandbox réel** : à faire par toi. Reçus : factures existantes. |
| IX | Espace utilisateur | Partiel | Profil, portefeuille, historique, messagerie, notifications, activité existent. **Non audité en détail** : gestion des sessions. |
| X | Centre admin | Partiel | Tableau de bord, transactions, demandes, rapport financier, **Bénéfices par période**, **services par pays (Boutique, Boost)**, journal, assistance, diffusion. **Manque** : rôles / permissions, gestion complète des marchés. |
| XI | Automatisation | Fait | 2 tâches quotidiennes : envois programmés, contrôle des soldes, nettoyage des comptes inactifs, alerte d'erreurs, surveillance du solde fournisseur. Contrôle humain conservé pour les retraits. IA seulement là où utile (Académie, maquettes) avec plafonds de dépense. |
| XII | Croissance | Fait | Sitemap, pages publiques, métadonnées, partage, parrainage, fidélité. Aucun faux avis ni faux chiffre (exemples marqués « Exemple »). |
| XIII | Sécurité | Partiel | Voir la partie « Sécurité ». **Règles Firestore non vues, App Check inactif, pas de rôles, CSP avec `unsafe-inline`.** |
| XIV | Finition visuelle | Partiel | Cohérence assurée par variables CSS et règle de couleur ; **jugement final sur appareil réel à faire par toi**. |
| XV | Tests | Partiel | 479 tests unitaires / intégration simulés, plus des **essais réels dans Chromium** pour les langues et la vitesse (non rejoués automatiquement). **Pas de bout en bout complet (Firebase simulé), pas de charge, pas de vrais fournisseurs.** Voir la partie « Tests ». |
| XVI | Méthode | Fait | Phases, liste de tâches, aucune opération d'argent modifiée sans transaction ni test. |
| XVII | Livraison intégrale | Partiel | Voir la liste ci-dessous (pas d'archive, à ta demande). |

### 3. Livrables de la Partie XVII

| # | Livrable | État |
|---|---|---|
| 1–5 | Frontend, backend, modules, nouvelles fonctions, services enrichis | Dans le dépôt (livraisons 1 à 6 ; la dernière contient tout ce qui a changé depuis la 5). |
| 6 | Migrations | **Aucune nécessaire** : pas de changement de structure de données. |
| 7 | Configurations | `vercel.json`, variables d'environnement : voir la partie « Éléments extérieurs à configurer ». |
| 8 | Design System | la partie « Design System » |
| 9 | Ressources graphiques | Logo, icônes, polices, vidéos d'intro déjà dans le dépôt (conservés). |
| 10 | Intégrations | 4 fournisseurs de paiement, fournisseur de croissance, notifications, IA : voir la partie « Éléments extérieurs à configurer ». |
| 11 | Tests | 54 fichiers dans `tests/` (479 tests). |
| 12–14 | Documentation, installation, déploiement | README, ARCHITECTURE, INSTALLATION-DEPLOIEMENT. |
| 15 | Rapport de sécurité | la partie « Sécurité » |
| 16 | Rapport de performance | la partie « Performance » (poids **et temps** mesurés en laboratoire dans Chromium ; pas sur de vrais téléphones) |
| 17 | Rapport d'audit | Ce document. |
| 18 | Matrice des services | Section 4. |
| 19 | Rapport des tests | la partie « Tests » |
| 20 | Éléments externes | la partie « Éléments extérieurs à configurer » |
| — | **Archive complète** | **Non fournie** : tu as demandé des fichiers un par un, sans zip. |

### 4. Matrice de transformation des services

« Audité » = j'ai lu le code complet de la logique et cherché des défauts. « Lu » = parcours lu, sans audit détaillé.

| Service | État initial | Problèmes identifiés | Ajouts | Backend | Tests | Résultat |
|---|---|---|---|---|---|---|
| **Portefeuille et recharges** (SasPay, Mobile Money, carte, crypto) | 4 modes, relevé `wallet_transactions`. | Taux de change aberrant possible ; file SasPay de plus de 100 paiements mal revérifiée ; achat de son propre produit créait de l'argent. | Taux borné 0,4×–2,5× ; lecture par pages ; garde nocturne ; **rapport financier + CSV + rapprochement**. | `payment-initiate`, `payment-webhook`, `saspay`, `payments-core`, `balance-guard` | 159 (argent) | Audité. Solide en tests simulés ; **essai réel fournisseur à faire**. |
| **Retraits vendeurs** | Retrait débité à la demande ; validation par la page admin. | Page admin écrivait les soldes : **double remboursement possible** ; montant non arrondi. | Opérations `wd_paid` / `wd_reject` côté serveur (une seule fois) ; arrondi, minimum 0,01, plafond 1 000 000. | `payments-core`, `notify-user` | `admin-requests`, `panel-wd` | Audité. Corrigé. |
| **Dépôts manuels** (admin) | Approbation par la page admin. | Même risque de double crédit. | `dep_approve` / `dep_reject` serveur ; refus pour SasPay ; plafond. | `payments-core` | `admin-requests` | Audité. Corrigé. |
| **Domaines** (boutique de domaines) | Achat par solde, activation par l'admin. | Refus : client remboursé mais **crédit admin non retiré** (argent créé). | `dom_activate` / `dom_reject` serveur, **écriture inverse** du revenu admin. | `payments-core`, `site-domain` | `admin-requests` | Audité. Corrigé. |
| **Croissance réseaux sociaux** | Commande chez fournisseur, remboursement en cas d'échec. | Aucun défaut relevé (remboursement sûr). | Surveillance quotidienne du solde fournisseur ; **fermeture possible par pays** (contrôle avant tout débit). | `place-smm-order`, `mtp-balance`, `_lib/availability` | `availability` (garde pays) ; **pas de test de la commande elle-même** | Audité (lecture). À tester avec le fournisseur. |
| **Sites web et sites clients** | Mini-sites, panneau propriétaire, sites clients financés. | Aucun défaut d'argent relevé (transferts audités). | — | `render-site`, `client-sites` | 39 (sites et pages) | Audité (argent) ; reste lu. |
| **Entreprises** (Business Pro) | Page entreprise publique, abonnement. | Aucun défaut relevé. | — | `payments-core`, `render-site` | `render-business` | Audité (argent). |
| **Factures** | Génération et page publique. | Aucun défaut relevé. | — | côté navigateur | `invoice-page` | Lu. |
| **Académie** | Cours, quiz, tuteur IA, essai gratuit, abonnement, planning. | Aucun défaut relevé ; plafonds de dépense IA présents. | — | `academy-ai`, `payments-core` | 42 | Audité (argent, IA). |
| **Concours** | Inscriptions et gains par solde. | Aucun défaut relevé (commission 15 %). | — | `payments-core` | `self-purchase` | Audité (argent). |
| **Événements et billets** | Billets par solde, validation à l'entrée. | Achat de son propre billet traité par la correction « soi-même ». | — | `payments-core`, `event-checkin` | `event-checkin`, `self-purchase` | Audité (argent). |
| **Boutique et livres** | Achats par solde, vendeur 85 %. | Achat de son propre produit corrigé. | **Fermeture possible par pays** (contrôle avant toute transaction). | `shop-purchase`, `payments-core`, `_lib/availability` | `self-purchase`, `availability` | Audité (argent). |
| **Emploi, immobilier, voyages, réservations** | Modules `immo-travel-pro`, `pro-finder-plus`, `location-*`. | Fichier en double `immo-travel-pro (1).js`. | — | côté navigateur | `counters` (compteurs) | **Lu seulement**, non audité en profondeur. |
| **Alertes, carte et localisation** | `earth-live`, `nearby-map`, `location-*`. | Aucun défaut relevé. | — | côté navigateur | `earth-live` | Lu. |
| **Messagerie, appels, notifications** | Messagerie, push, appels. | Aucun défaut relevé. | — | `notify-user`, `broadcast-notification` | 58 | Audité (envoi, clic, activation). |
| **Parrainage, fidélité, partage** | Codes, points, pages partageables. | Aucun défaut relevé (fidélité auditée côté argent). | — | `payments-core` | `share-page` | Audité (argent). |
| **Administration** | Page admin séparée. | Opérations d'argent faites par la page (voir ci-dessus) ; onglet Bénéfices relisait toutes les commandes. | **Rapport financier** (onglet Bénéfices) + export CSV sécurisé (neutralise les formules) + **correction d'une recharge créditée plusieurs fois** (compte nommé, bouton de retrait, une seule fois) + **Bénéfices par période** + **carte « Services disponibles par pays »**. | `payments-core` (`adminManage`) | `admin-requests`, `admin-icons`, `admin-profit`, `availability` | Audité. Reste : **rôles**. |
| **Langues** | 5 langues complètes, toutes chargées à chaque ouverture (125 Ko compressés). | Pas de langues africaines ; textes inutiles téléchargés. | **Kiswahili et Lingála complets** (1 864 textes, bêta à relire) ; **tout change quand on change de langue** (page relancée une fois) ; filet de sécurité pour les textes français restants ; **chargement à la demande** : français dans l'application, 6 petits fichiers `lang-xx.js`, reprise automatique au retour du réseau. | `translations.js`, `lang-*.js` | `langues-afrique`, `lang-packs` (21), essais réels Chromium | Fait et mesuré ; **relecture par un locuteur natif nécessaire**. |
| **Automatisations** | Envois programmés, contrôle des soldes. | Aucun défaut relevé. | — | `run-scheduled-broadcasts`, `mtp-balance` | `balance-guard`, `monitoring`, `notifications` | Audité (lecture). |

### 5. Ce que je ne peux pas affirmer

- Que les paiements fonctionnent avec les **vrais** serveurs des fournisseurs.
- Que les **règles Firestore** empêchent toute écriture directe d'un solde par le navigateur.
- Que l'application est fluide sur **tous** les téléphones et réseaux (les temps ont été mesurés en laboratoire, avec un réseau et un processeur simulés).
- Qu'un service fermé pour un pays l'est vraiment pour **toutes** les personnes de ce pays : le pays vient de la connexion internet et un VPN peut le contourner.
- Que les textes **Kiswahili et Lingála** sont sans faute (traduits avec l'aide d'une IA : une personne qui parle ces langues doit les relire).
- Que **tous** les écrans changent de langue : la page principale, le menu, les réglages, l'assistance et les fiches « Exemple » oui ; certains écrans internes (Académie : quiz, certificats, documents ; Centre de localisation ; guide ; constructeur de site ; panneau) ont encore leurs propres textes en français/anglais.

---

## Partie 6 : Sécurité

Ce rapport dit ce qui est **réellement en place** (vérifié dans le code), les failles **trouvées et corrigées** pendant ce travail, et les **risques qui restent**. Il ne prétend pas qu'une application est « inviolable » : ce serait faux.

### 1. Ce qui protège l'application aujourd'hui

| Sujet | Ce qui est en place | Où |
|---|---|---|
| Identité | Chaque fonction serveur vérifie le jeton Firebase de la personne (et sa révocation). Le compte administrateur est reconnu **côté serveur** par son identifiant, jamais parce que la page « dit » qu'elle est admin. | `api/_lib/security.js` |
| Limitation des requêtes | Compteur par personne et par action (plus de 10 fichiers serveur l'utilisent : retraits, paiements, achats, sites, notifications…). | `security.js` (`rateLimit`) |
| Argent | Tout calcul et toute écriture d'argent se font **côté serveur**, dans une transaction Firestore, avec une ligne dans le relevé `wallet_transactions`. Le navigateur n'envoie que « quoi » et « qui », jamais « combien ». | `api/_lib/payments-core.js` |
| Paiements | Une recharge n'est créditée qu'après **signature valide** de la notification (HMAC SHA-256, comparaison à temps constant) puis **revérification auprès du fournisseur** ; un verrou empêche le double crédit. Les quatre fournisseurs sont couverts : SasPay, Cryptomus, MBotePay, OPTGateway. | `api/payment-webhook.js`, `api/_lib/saspay.js` |
| Clé de test | Une clé SasPay `sk_test_` est refusée en production (sinon de faux paiements créditeraient de vrais soldes). | `saspay.js` |
| Cartes bancaires | Aucun numéro de carte n'est stocké ni affiché : le paiement se fait sur la page du fournisseur. | — |
| Contrôle nocturne | Chaque nuit, le serveur compare chaque solde au dernier mouvement du relevé et alerte en cas d'écart. | `api/_lib/balance-guard.js` |
| Appels vers l'extérieur | Les adresses privées (réseau interne, `127.0.0.1`, `169.254.169.254`…) sont refusées : protection contre le détournement du serveur (SSRF). | `api/_lib/safe-http.js` |
| Secrets des sites clients | Les clés saisies par les propriétaires de sites sont chiffrées avant enregistrement et masquées à l'affichage. | `api/_lib/site-panel.js` |
| Texte saisi par les gens | Un test automatique échoue si un nom, un titre, une bio ou un commentaire est inséré dans une page sans `escapeHtml()`. | `tests/xss-audit.test.js` |
| En-têtes HTTP | HSTS 2 ans (preload), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (paiement bloqué, caméra/micro limités), `Cross-Origin-Opener-Policy`, **Content-Security-Policy** avec liste précise des sites autorisés. | `vercel.json` |
| Pages sensibles | `admin.html` : `noindex` + `no-store` (jamais mise en cache). Réponses `/api/*` : `no-store`. | `vercel.json` |
| Secrets | Aucune clé secrète dans le dépôt : tout passe par les variables d'environnement Vercel. | vérifié par recherche dans les fichiers |
| App Check | Le module `app-check.js` (reCAPTCHA v3, mode surveillance) est **prêt mais INACTIF** : la ligne `SITE_KEY` est vide dans le fichier, donc il ne fait rien. Il s'active en y collant la clé publique reCAPTCHA v3 ; ensuite « Appliquer » se fait dans la console Firebase après quelques jours à ~100 %. | `app-check.js` |
| Services par pays | L'administrateur peut fermer la **Boutique** et le **Boost** pour des pays (onglet Tarifs). Le **serveur** refuse l'achat **avant** toute transaction ou tout débit, d'après le pays de la connexion. Vide par défaut ; en cas de doute (pays inconnu, panne, réglage illisible) le service reste ouvert ; l'administrateur n'est jamais bloqué. | `api/_lib/availability.js`, `shop-purchase.js`, `place-smm-order.js` |
| Journal | Les actions de l'administrateur sont journalisées ; les erreurs du navigateur sont collectées ; alerte si les erreurs explosent. | `care.js`, `run-scheduled-broadcasts.js` |

### 2. Failles trouvées et corrigées dans ce travail

| # | Faille | Risque | Correction |
|---|---|---|---|
| 1 | **Acheter son propre produit** créait de l'argent (le vendeur et l'acheteur étaient la même personne). | Création de solde. | Refus côté serveur + détection dans le contrôle nocturne + test `self-purchase`. |
| 2 | **Retraits, demandes de domaine et dépôts manuels** étaient validés par la page admin (le navigateur écrivait les soldes). Un double clic ou un rejeu pouvait **rembourser ou créditer deux fois**. | Double remboursement / double crédit. | Les 6 opérations (`wd_paid`, `wd_reject`, `dom_activate`, `dom_reject`, `dep_approve`, `dep_reject`) passent par le serveur : statut « en attente » obligatoire, montants lus dans la demande enregistrée, une seule application. 27 tests. |
| 3 | **Refus d'un domaine** : le client était remboursé mais le crédit de l'administrateur n'était **pas retiré**. | Argent créé à chaque refus. | Remboursement unique + écriture inverse du revenu admin (`site_domain_purchase_income_reversed`). |
| 4 | **Taux de change aberrant** (API de change en panne ou erronée) pouvait créditer un mauvais montant en SasPay. | Mauvais crédit. | Taux accepté seulement entre 0,4× et 2,5× du taux de secours ; sinon taux de secours ; sans taux → service indisponible (pas de devinette). |
| 5 | **File SasPay de plus de 100 paiements en attente** : les plus anciens n'étaient plus revérifiés. | Paiements réels non crédités. | Lecture par pages (jusqu'à 5 pages par statut), tests `saspay-queue`. |
| 6 | **Montant de retrait vendeur** non arrondi / sans plafond. | Montants invalides, centimes fantômes. | Arrondi à 2 décimales, minimum 0,01, maximum 1 000 000, refus si non numérique. |
| 7 | **Une recharge validée 7 fois** avec l'ancienne méthode (page admin) : une demande de 5 $ a crédité 35 $. Trouvée par le rapport financier du 17/11/2026. | 30 $ créés sans paiement sur un compte. | Plus possible : le serveur refuse une demande déjà validée (corrigé en n° 2). Pour l'existant : le rapport nomme le compte et un bouton retire le surplus **une seule fois** (jamais sous zéro, ligne `topup_correction` dans le relevé, journal admin). 5 tests. |

### 3. Risques qui restent (à connaître honnêtement)

| Risque | Gravité | Explication | Piste |
|---|---|---|---|
| **Règles Firestore non auditées par moi** | Haute | Le fichier de règles n'est pas dans le dépôt : je ne l'ai jamais vu, donc je ne peux **pas** certifier que le navigateur ne peut pas écrire un solde ou lire les données d'autrui. Tout le reste de la sécurité repose en partie sur elles. | Faire relire les règles (petits morceaux à coller, jamais en fichier). |
| **App Check inactif** | Moyenne | Sans lui, un script pirate qui connaît la configuration publique de Firebase peut parler à Firestore comme s'il était ton application (les règles Firestore restent la seule barrière). | Coller la clé reCAPTCHA v3 dans `app-check.js`, observer, puis appliquer. |
| Pas de **rôles** | Moyenne | Un seul compte administrateur, qui peut tout. Pas de modérateur limité, pas de « deux personnes pour valider un gros retrait ». | Voir la feuille de route. |
| CSP avec `unsafe-inline` | Moyenne | Les scripts et styles écrits dans les pages sont autorisés ; en cas de faille XSS, la CSP protège moins. Le test anti-XSS réduit ce risque. | Migrer les scripts en ligne vers des fichiers, puis retirer `unsafe-inline`. |
| Limitation des requêtes « laisse passer » si Firestore est indisponible | Faible | C'est un choix de disponibilité (mieux vaut ne pas bloquer tout le monde). | Acceptable ; surveiller. |
| Aucun test avec de **vrais** fournisseurs de paiement | Moyenne | Les tests simulent les réponses des fournisseurs ; ils ne remplacent pas un essai réel en mode test du fournisseur. | Essai en bac à sable fait par toi chez chaque fournisseur. |
| Pas de test de **bout en bout** dans un navigateur | Moyenne | L'environnement de travail n'atteint pas Firebase. | Voir la partie « Tests ». |
| Connexion par **SMS** et Apple / Facebook / Microsoft | — | Reportés à ta demande (le SMS demande Firebase Blaze). | Feuille de route. |
| Sauvegardes automatiques de Firestore | Moyenne | Seul l'export manuel existe (`care.js`). | Formule Blaze + export planifié. |
| **Services par pays** : contournable | Faible | Le pays vient de la connexion internet (en-tête Vercel / Cloudflare) : un VPN peut le contourner et un pays inconnu n'est jamais bloqué. Seuls la Boutique et le Boost sont contrôlables, et seulement au moment de l'achat (les boutons ne sont pas masqués). Ce n'est pas une preuve de résidence. | Étendre aux autres achats ; ne pas s'en servir comme garantie juridique. |
| Fichier en double `immo-travel-pro (1).js` | Faible | Non utilisé mais différent du vrai fichier : source de confusion. | Le supprimer du dépôt. |

### 4. Règles de sécurité à ne jamais casser

1. Ne jamais faire confiance à un montant envoyé par le navigateur.
2. Ne jamais marquer un paiement « réussi » sans confirmation du fournisseur.
3. Ne jamais stocker de numéro de carte.
4. Toute nouvelle opération d'argent = une transaction serveur + une ligne dans `wallet_transactions` + un test.
5. Toute nouvelle clé secrète = variable d'environnement Vercel, jamais dans un fichier du dépôt.

---

## Partie 7 : Architecture

### Vue d'ensemble

- **Application** : JavaScript simple (sans framework), installable (PWA), hébergée sur **Vercel** (formule gratuite).
- **Données et comptes** : **Firebase** (Authentication + Firestore). Le navigateur lit Firestore avec les règles de sécurité ; le serveur écrit tout ce qui touche à l'argent.
- **Fichiers du front** (à la racine) : `index.html`, `script.js` (cœur), et des modules « pro » par service (`menu-pro.js`, `payments-pro.js`, `invoice-pro.js`, `academy-*.js`, `site-*.js`, …). Ils sont regroupés par `tools/build.js` dans `app.min.js` et `app.min.css`. Les **packs de langue** (`lang-en.js`, `lang-es.js`, `lang-it.js`, `lang-pt.js`, `lang-sw.js`, `lang-ln.js`) restent à part : chargés à la demande.
- **Administration** : `admin.html` + `admin.js` + `admin-pro.css` (page séparée, réservée au compte administrateur), avec des petits modules : `admin-profit.js` (Bénéfices par période : calcul et lecture limitée), `admin-availability.js` (carte « Services disponibles par pays »), `admin-login-methods.js`, `admin-icons.js`…
- **Serveur** : dossier `api/` (12 fonctions Vercel) et `api/_lib/` (la logique partagée).

### Les 12 fonctions serveur (`api/`)

| Fonction | Rôle |
|---|---|
| `payments-actions.js` | Point d'entrée des opérations d'argent (achats par solde, concours, billets, cours, domaines, actions admin). La logique est dans `_lib/payments-core.js`. |
| `payment-initiate.js` | Démarre une recharge (SasPay, Mobile Money, carte, crypto). |
| `payment-webhook.js` | Reçoit les notifications des fournisseurs (SasPay, Cryptomus, MBotePay, OPTGateway), les vérifie, crédite une seule fois. Contient aussi les actions admin SasPay et le contrôle des soldes. |
| `place-smm-order.js` | Commandes de croissance réseaux sociaux auprès du fournisseur, avec remboursement sécurisé. |
| `shop-purchase.js` | Achats de la boutique (livres, produits). |
| `render-site.js` | Génère et sert les sites des utilisateurs, les pages publiques des services et le guide. |
| `notify-user.js` | Notifications, demandes de retrait des vendeurs, messages. |
| `broadcast-notification.js` | Envoi de notifications à tous (admin). |
| `run-scheduled-broadcasts.js` | **Tâche automatique quotidienne (8 h)** : envois programmés, contrôle des soldes, nettoyage des comptes inactifs, alerte si trop d'erreurs. |
| `mtp-balance.js` | **Tâche automatique quotidienne (6 h)** : surveille le solde chez le fournisseur de commandes (alerte si bas) et nettoie les anciens journaux de notifications ; utilisable aussi depuis l'admin. |
| `generate-mockup.js` | Maquettes générées par IA (payantes, remboursées en cas d'échec). |
| `get-service-map-defaults.js` | Correspondance des services du fournisseur. |

### Modules serveur importants (`api/_lib/`)

- `security.js` : vérification de l'identité (jeton Firebase), limitation du nombre de requêtes, journal.
- `payments-core.js` : opérations d'argent. Chaque opération est **une transaction Firestore** : lire d'abord, écrire ensuite, solde + ligne de relevé ensemble.
- `wallet-ledger.js` : écrit chaque mouvement dans `wallet_transactions` avec le solde après opération.
- `balance-guard.js` : compare chaque solde au dernier mouvement du relevé ; détecte aussi les achats « de son propre produit » (ancienne faille).
- `saspay.js` : SasPay (pays, devises, taux de change, session de paiement, vérification).
- `care.js` : sauvegarde exportable, journal d'activité de l'administrateur, assistance.
- `topup-seal.js` : sceau qui empêche de modifier une demande de recharge.
- `availability.js` : services fermés par pays (réglage `pricing/service_availability`, pays de la connexion, mémoire de 60 s, « en cas de doute on laisse passer »). Appelé par `shop-purchase.js` et `place-smm-order.js` avant tout mouvement d'argent. Rangé dans `_lib/` : ne compte pas comme fonction Vercel.
- `public-pages.js`, `site-*.js`, `guide-data.js` : pages publiques et sites générés (référencement).

### Où va l'argent

1. **Recharge** : le client paie chez le fournisseur → la notification arrive sur `payment-webhook.js` → le serveur **revérifie** auprès du fournisseur → crédite **une seule fois** (verrou `payment_claims`) → ligne `topup_*` dans le relevé.
2. **Achat par solde** (cours, billets, concours, livres, domaines, commandes) : une transaction débite l'acheteur, crédite le vendeur (85 %) et l'administrateur (15 %), et écrit les lignes du relevé.
3. **Retrait** : le solde est débité à la demande ; l'administrateur marque « payé » ou « refusé » — **le serveur** applique et ne rembourse qu'une seule fois.
4. **Contrôle** : chaque nuit le serveur compare les soldes au relevé ; l'onglet Bénéfices de l'admin donne le **rapport financier** (recharges, retraits, mouvements internes, rapprochement avec les demandes de recharge) ; si une recharge a été créditée plusieurs fois, il nomme le compte et permet de retirer le surplus une seule fois (`fin_correct`).

### Collections Firestore principales

`users`, `wallet_transactions`, `topup_requests`, `payment_claims`, `withdrawal_requests`, `domain_purchase_requests`, `orders`, `contests`, `contest_entries`, `events`, `event_tickets`, `courses`, `course_enrollments`, `mini_sites`, `notif_logs`, `client_errors`, `app_config`, `admin_audit` (et une centaine d'autres collections de contenu).

### Les langues

Huit langues : français, anglais, espagnol, italien, portugais, **allemand, Kiswahili et Lingála** — les 1 864 textes de la page principale existent dans les 8 langues (allemand, Kiswahili et Lingála : traduits avec l'aide d'une IA, **à faire relire par une personne qui parle ces langues**).

- Le **français** est dans `translations.js` (toujours chargé, c'est la langue de base), avec le moteur : `t()`, `applyTranslations()`, `changeLanguage()`, `addTranslation()`.
- Chaque **autre langue** est un fichier à part (`lang-xx.js`) téléchargé **seulement si la personne la choisit**. `index.html` demande tout de suite le fichier de la langue enregistrée (en parallèle du reste) ; l'ordre d'arrivée n'a pas d'importance.
- Dans `index.html`, un texte se traduit avec `data-i18n="clé"` ; un champ, une infobulle, un texte pour lecteur d'écran ou une image avec `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria-label`, `data-i18n-alt`.
- **Après un vrai changement de langue, la page se relance une seule fois** (moins d'une seconde, depuis le cache) pour que tous les écrans déjà dessinés repartent dans la nouvelle langue. Pas de relance si la fenêtre de connexion est ouverte, ni pour la même langue, ni au démarrage. Interrupteur de test : `window.__cnNoLangReload = true`.
- **Filet de sécurité** (`translateLiterals`) : un texte resté en français dans un écran est traduit s'il est EXACTEMENT un texte français connu du dictionnaire (jamais un texte partiel, un nombre, une zone de saisie ni un bloc `translate="no"`). Le français n'est jamais modifié.
- Pas de réseau : le texte reste en français (jamais vide, jamais une clé brute), message clair au changement de langue, et la langue s'applique toute seule au retour du réseau.
- Une clé qui manquerait un jour en Kiswahili ou en Lingála s'affiche en français (jamais en anglais) ; en allemand, elle s'afficherait en anglais.
- **Allemand (`de`)** : ajouté comme les autres langues (`lang-de.js`, bouton « Deutsch », entrée dans `translations.js`, `tools/build.js`, `vercel.json`). Il a aussi sa table `window.__cnPhrases.de` (2 927 textes d'écrans internes). Les petits dictionnaires de `menu-pro.js`, `care-pro.js` et `showcase.js` ont un bloc `DE`/`CDE` à part (les listes d'origine gardent 7 colonnes). Dans `showcase.js`, les exemples de fiches s'affichent en anglais pour l'allemand.
- **Écrans internes** (Académie, Centre de localisation, guide, constructeur de site, aide…) : ces écrans ont leurs propres textes (français, anglais, espagnol, italien, portugais). Pour le Kiswahili et le Lingála, chaque pack (`lang-sw.js`, `lang-ln.js`) contient une table `window.__cnPhrases.<langue>` « texte français affiché → traduction » (environ 2 400 textes chacun), appliquée par le moteur de `translations.js` **uniquement quand le texte affiché est exactement celui de la table** ; un texte avec des variables (`{n} leçons`) fonctionne comme un modèle. Un texte absent de la table reste en français. Pour en ajouter un : l'écrire dans la table de chaque pack, puis `node tools/build.js` (les tests `lang-phrases` contrôlent les variables).
- Les modules avec leurs propres petits dictionnaires (`menu-pro.js`, `care-pro.js`, `showcase.js`) sont en 8 langues ; les autres (Académie, Centre de localisation, guide, constructeur de site, panneau) restent à faire.
- Les modules qui ajoutent leurs propres textes passent par `addTranslation(langue, clé, texte)` : jamais d'écriture directe dans `TRANSLATIONS[langue]` (un test le vérifie).
- Corriger un texte : le français dans `translations.js`, une autre langue dans son `lang-xx.js`, puis `node tools/build.js` (qui écrit le numéro de version du fichier dans `index.html`).

---

## Partie 8 : Tests

**Commande** : `node --test tests/*.test.js` (Node.js 20 ou plus, aucune dépendance à installer).
**Dernier résultat complet** : **458 tests sur 458 réussis**, répartis dans **52 fichiers**, aussi sur une copie « ordinateur GitHub vierge » (sans aucun paquet installé). La vérification finale est relancée avant livraison (voir la fin de ce document).
Les tests se lancent aussi tout seuls sur GitHub à chaque dépôt si `ci.yml` est rangé dans `.github/workflows/`.

### Comment les tests sont faits

- Les fonctions serveur sont chargées avec de **fausses** versions de Firebase, de la sécurité et des notifications.
- Une **fausse base Firestore en mémoire** imite les lectures, les écritures, les filtres et les **transactions avec versions** (rejeu en cas de conflit), pour vérifier les doubles clics et les rejeux.
- Les textes du front (`translations.js` pour le français, `lang-xx.js` pour les autres langues) sont exécutés dans un bac à sable isolé avec un **faux navigateur** (`tests/lang-env.js` : faux stockage, faux document, fausse horloge, faux téléchargement qui réussit, échoue ou ne répond jamais).
- Des **tests de sabotage** ont été faits : on retire volontairement une protection (dernier choix de langue, double téléchargement, garde par pays, exception administrateur…) et on vérifie qu'au moins un test devient rouge.

### Ce qui est couvert

| Domaine | Fichiers | Tests | Ce qui est vérifié |
|---|---|---|---|
| **Argent et paiements** | `admin-requests`, `saspay`, `payment-webhook`, `optgateway`, `mobile-money-opt`, `pay-speed`, `pay-flow`, `payment`, `self-purchase`, `balance-guard`, `saspay-queue`, `panel-wd` | **159** | Opérations admin (retraits, domaines, dépôts) appliquées **une seule fois**, remboursements uniques, rapport financier et CSV, signatures des notifications, rejeu d'une même notification sans double crédit, taux de change, file SasPay de plus de 100 paiements, achat de son propre produit refusé, contrôle des soldes, retraits vendeurs. |
| **Sécurité et intégrité** | `xss-audit`, `safe-http`, `integrity`, `care` | **30** | Aucun texte saisi inséré sans protection, adresses internes refusées, secrets chiffrés, fichiers valides, traductions complètes, boutons reliés à une fonction, limite de 12 fonctions Vercel, en-têtes de sécurité non affaiblis, assistance (demandes limitées à 5 en cours, droits), export personnel sans secrets. |
| **Messagerie et notifications** | `messaging`, `notifications`, `notification-click`, `message-notification`, `push-guide`, `monitoring` | **58** | Envoi, lecture, clic sur une notification, guide d'activation des notifications (une seule demande de permission), App Check (reCAPTCHA v3) et collecte des erreurs. |
| **Académie et IA** | `academy-ai`, `academy-quiz`, `academy-trial`, `academy-v2`, `study-planner`, `ai-spend` | **42** | Génération de cours, quiz, essai gratuit, planning d'étude, plafond de dépense IA. |
| **Sites et pages publiques** | `render-site`, `render-business`, `site-owner`, `site-system`, `site-panel`, `site-panel-render`, `site-stats`, `share-page`, `invoice-page` | **39** | Génération des sites, pages d'entreprise, panneau propriétaire, statistiques, pages de partage, factures. |
| **Langues et poids** | `lang-packs`, `perf-budget` | **24** | Chaque pack de langue bien formé et rangé sous son code ; texte **identique** quel que soit l'ordre d'arrivée des fichiers ; français affiché en attendant, puis langue appliquée à l'arrivée ; pas de double téléchargement ; réseau absent, lent ou en panne ; choix qui change vite ; reprise au retour du réseau ; le fichier rapide ne contient aucune autre langue ; démarrage anticipé dans `index.html` identique à la détection du moteur ; `build.js --check` refuse un pack modifié ; petites images jamais lourdes ; garde-fou de poids. |
| **Admin : bénéfices et services par pays** | `admin-profit`, `availability` | **16** | Périodes (aujourd'hui, 7/30/92 jours, mois, tout), lecture limitée et plafonnée à 3 000 commandes, total signalé comme partiel au-delà ; pays de la connexion, réglage nettoyé, refus Boutique et Boost **avant** toute transaction, administrateur jamais bloqué, pays inconnu ou panne = ouvert, **fichier `availability.js` absent (dépôt incomplet) = ouvert aussi**, une lecture par minute, nombre de fonctions Vercel ≤ 12. |
| **Divers** | `earth-live`, `event-checkin`, `counters`, `my-activity`, `legacy-host`, `intro-splash`, `admin-icons`, `bundle`, `langues-afrique`, `connexion-pays` | **69** | Carte en direct, validation des billets, compteurs, activité, ancien domaine non indexé, écran d'intro, icônes admin et **numéros de version**, **fichier regroupé à jour**, Kiswahili / Lingála, liste des pays de recharge SasPay (alphabétique, sans pays favori). |

### Ce qui n'est PAS couvert (à lire)

| Manque | Conséquence |
|---|---|
| **Aucun test avec de vrais fournisseurs de paiement** (SasPay, Cryptomus, MBotePay, OPTGateway) | La logique est vérifiée avec des réponses imitées. Un essai réel en mode test chez chaque fournisseur reste à faire par toi. |
| **Aucun test de bout en bout complet dans un navigateur** (l'environnement de travail n'atteint pas Firebase) | Les parcours « je clique, je vois » ne sont pas rejoués automatiquement. Des essais réels dans Chromium (Firebase remplacé par un faux objet) ont été faits à la main pour les langues et la vitesse : résultats dans la partie « Performance », mais **non rejoués par la suite de tests**. |
| **Règles Firestore non testées** | Je n'ai pas le fichier de règles ; leur comportement n'est pas vérifié. |
| **Pas de test de charge** | On ne sait pas combien de personnes en même temps. |
| **Tailles d'écran et vrais téléphones** | Contrôlées par lecture du CSS, pas sur appareils. |
| **Allemand, Kiswahili et Lingála** | Les textes sont testés pour la structure (clés, chiffres, repli en français) mais **pas relus par un locuteur natif**. |

### Vérification finale avant livraison

Les résultats exacts de la dernière exécution (build, `--check`, tests) sont donnés dans le message de livraison.

---

## Partie 9 : Performance

Ce rapport donne des chiffres **mesurés** (poids des fichiers et temps dans un vrai navigateur Chromium avec réseau et processeur ralentis), et dit clairement ce que ces mesures **ne prouvent pas**.

### 1. Ce qui a été fait dans cette étape

| Changement | Effet mesuré |
|---|---|
| **Les langues se chargent à la demande.** Le français reste dans l'application ; l'anglais, l'espagnol, l'italien, le portugais, le kiswahili et le lingála sont des petits fichiers (`lang-xx.js`) téléchargés seulement si la personne choisit cette langue. | `app.min.js` : 1 307 062 → **986 209 octets** (−321 Ko bruts). Le texte de 11 858 entrées est identique à avant (comparé un par un). |
| **Logo de l'en-tête et de la carte de bienvenue** : l'icône 192 px (38 Ko) remplace l'icône 512 px (225 Ko), même dessin, affichée en 34 / 46 / 50 pixels. | −183 Ko téléchargés à chaque première ouverture. |
| **Onglet Bénéfices de l'admin** : lecture limitée à la période choisie (30 jours par défaut, 3 000 commandes au plus) au lieu de toute la collection `orders`. | Nombre de lectures Firestore borné ; « Tout » reste possible, par choix explicite. |

### 2. Mesures dans un vrai navigateur

**Méthode.** Chromium réel, serveur de mesure avec compression **Brotli** (comme un hébergeur), cache vide à chaque passage (première visite). Deux réseaux simulés, avec processeur 4 fois plus lent (téléphone modeste) : **4G lente** (1,6 Mbit/s, 150 ms) et **3G** (400 kbit/s, 400 ms). Chaque chiffre est la **médiane** de 5 passages (4G lente) ou 3 passages (3G). « Avant » = copie exacte du projet juste avant ce travail ; « après » = version livrée. Aucune erreur JavaScript dans les deux versions (Firebase est remplacé par un faux objet, car l'environnement de travail ne l'atteint pas).

#### Première ouverture d'un visiteur français (le cas courant)

| | 4G lente avant | 4G lente après | 3G avant | 3G après |
|---|---|---|---|---|
| Page prête (DOMContentLoaded) | 4 794 ms | **3 597 ms** (−25 %) | 18 615 ms | **13 751 ms** (−26 %) |
| Page complètement chargée | 7 154 ms | **5 955 ms** (−17 %) | 27 308 ms | **22 441 ms** (−18 %) |
| Octets téléchargés | 1 250 Ko | **1 009 Ko** (−19 %) | 1 250 Ko | **1 009 Ko** |

#### Première ouverture d'un visiteur dont le téléphone est en anglais

Le fichier de sa langue est demandé tout de suite (en parallèle du reste), pas après.

| | 4G lente avant | 4G lente après | 3G avant | 3G après |
|---|---|---|---|---|
| Texte affiché en anglais | 4 796 ms | **3 707 ms** | 18 599 ms | **14 197 ms** |
| Octets téléchargés | 1 250 Ko | 1 031 Ko | 1 250 Ko | 1 031 Ko |

#### D'où vient le gain

| Étape | Octets (visiteur français) | Page prête 4G lente |
|---|---|---|
| Avant | 1 250 Ko | 4 794 ms |
| Après la découpe des langues seule | 1 192 Ko (−59 Ko) | 4 425 ms (−0,4 s) |
| Après le logo allégé aussi | 1 009 Ko (−183 Ko de plus) | 3 597 ms |

**Ce qui n'a pas changé** : le temps de calcul JavaScript (≈ 400 à 480 ms mesurés, identique avant et après, à la marge d'erreur près). Le gain vient du **téléchargement**, pas du calcul.

#### Changer de langue

| Cas | 4G lente | 3G |
|---|---|---|
| Français → espagnol (fichier de 23 Ko à télécharger) | **0,30 s** | **0,89 s** |
| Repasser sur une langue déjà chargée | ≈ 10 ms, aucune requête | ≈ 16 ms, aucune requête |

#### Pannes et retours

| Situation | Résultat vérifié dans le navigateur |
|---|---|
| Pas de réseau au moment de changer de langue | La langue actuelle reste, le sélecteur revient dessus, message rouge « Impossible de charger cette langue. Vérifie ta connexion puis réessaie. », le choix enregistré ne change pas, aucune erreur. |
| Le réseau revient, la personne réessaie | La langue s'applique. |
| Ouverture en anglais sans réseau pour le fichier de langue | Texte en français (jamais de texte vide ni de clé brute) ; **dès que la connexion revient, l'anglais s'applique tout seul**. |
| Fichier de langue qui ne répond jamais | Abandon propre après 12 s. |
| Choix qui change vite (anglais puis espagnol) | Le dernier choix gagne, même si les fichiers arrivent dans le désordre. |

#### Deuxième visite (cache du navigateur), visiteur anglais, 4G lente

| | 1re visite | 2e visite |
|---|---|---|
| Octets téléchargés | 1 031 Ko | **11,7 Ko** |
| Texte affiché en anglais | 3 642 ms | **592 ms** |
| `app.min.js` et `lang-en.js` redemandés au serveur | — | **non** (cache d'un an, nom versionné) |

### 3. Poids des fichiers (octets)

| Fichier | Avant : brut / gzip / brotli | Après : brut / gzip / brotli |
|---|---|---|
| `app.min.js` | 1 307 062 / 349 637 / 271 517 | **986 209 / 254 266 / 210 603** |
| `translations.js` (dans `app.min.js`) | 462 606 / 125 343 / 92 672 | 104 222 / 29 237 / 27 891 (français + moteur) |
| `index.html` | 191 838 / 37 119 / 32 255 | 193 020 / 37 642 / 32 806 (+ 1,2 Ko bruts, + 0,5 Ko compressés : le démarrage anticipé des langues) |
| `app.min.css` | 176 182 / 33 224 | inchangé |
| `sw.js` | 15 638 / 5 776 | inchangé |

| Pack de langue (chargé à la demande) | Brut | gzip | brotli |
|---|---|---|---|
| `lang-en.js` | 84 904 | 23 104 | 21 995 |
| `lang-es.js` | 89 887 | 24 662 | 23 521 |
| `lang-it.js` | 90 339 | 24 369 | 23 476 |
| `lang-pt.js` | 89 981 | 24 832 | 23 794 |
| `lang-sw.js` (kiswahili, bêta) | 8 360 | 3 365 | 3 283 |
| `lang-ln.js` (lingála, bêta) | 317 320 | environ 95 000 | — |
| `lang-de.js` (allemand, bêta) | 329 671 | environ 107 500 | — |

(Les tailles de `lang-sw.js` et `lang-ln.js` ci-dessus datent d'avant les tables d'écrans internes ; aujourd'hui ≈ 316 Ko chacun, ≈ 95–102 Ko compressés. Ils ne sont téléchargés que si la personne choisit la langue.)

Les packs ne sont **pas** minifiés : ce sont les fichiers à modifier pour corriger un texte (puis `node tools/build.js`).

### 4. Ce qui est téléchargé à chaque première ouverture (version livrée)

46 requêtes, 1 009 Ko compressés (vidéos d'intro non comptées). Les plus gros :

| Fichier | Taille |
|---|---|
| `app.min.js` | 206 Ko |
| `logo-mark.png` | 124 Ko |
| `hero-phones-v2.webp` | 78 Ko |
| `cn-serif.woff2` | 40 Ko |
| `icon-192-v2.png` | 38 Ko |
| `academy-hub.js` | 33 Ko |
| page `/` (HTML) | 32 Ko |
| `messaging-pro.js` | 31 Ko |
| `app.min.css` | 29 Ko |
| 4 polices (`cn-inter-400/500/600`, `cn-display-600`) | 24 à 26 Ko chacune |
| `panel-store.js` | 24 Ko |

### 5. Mécanismes qui accélèrent déjà les visites suivantes

| Mécanisme | Effet |
|---|---|
| `app.min.js`, `app.min.css` et **les packs de langue** : cache d'**1 an** (`immutable`), nom versionné par empreinte | Après la 1re visite, rien à retélécharger tant que le fichier ne change pas. |
| Images, polices : cache 7 jours + mise à jour en arrière-plan | Affichage immédiat, rafraîchi discrètement. |
| Vidéos d'intro : cache d'1 an | Pas de retéléchargement. |
| `sw.js` et `manifest.json` : toujours revérifiés | Les mises à jour arrivent (on change `CACHE_NAME` à chaque livraison). |
| Service worker (PWA) | L'application démarre depuis la mémoire du téléphone. |
| `/api/*` : jamais en cache | Les soldes et les statuts sont toujours à jour. |
| Compression, `defer` sur le script principal, repli automatique si le fichier regroupé échoue | Affichage sans blocage, avec secours. |

### 6. Points faibles restants (mesurés)

| Point | Pourquoi c'est un souci | Gain possible |
|---|---|---|
| ~~`logo-mark.png` : 124 Ko~~ | **Fait (v41)** : l'écran d'ouverture utilise `logo-mark-480.webp` (40 Ko). | — |
| ~~`hero-phones-v2.webp` : 78 Ko~~ | **Fait (v41)** : 4 tailles (34 / 47 / 64 / 79 Ko), le téléphone choisit la bonne. | — |
| 5 polices : ≈ 142 Ko | Téléchargées à l'ouverture. | Garder 3 graisses au lieu de 4 ; « sous-ensemble » des caractères réellement utilisés. |
| Modules JS chargés au démarrage (`academy-hub.js`, `messaging-pro.js`, `panel-store.js` : ≈ 88 Ko) | Rarement utiles dès la 1re seconde. | Les charger quand la personne ouvre le service. |
| `script.js` est un seul gros bloc | Tout est analysé même si on n'ouvre qu'un service. | Découpage par service. Chantier important. |
| `index.html` de 32 Ko compressés | Contient l'écran de tous les services. | Charger les écrans rares à la demande. |
| `icon-512-v2.png` (225 Ko) | Reste nécessaire pour l'installation de l'application (manifest). | Version optimisée du même dessin. |
| Onglet **Tableau de bord** de l'admin lit encore `users` et `orders` en entier (`loadStats`) | Coût de lecture croissant. | Compteurs agrégés. |

### 7. Ce que ces mesures ne prouvent pas

- Ce sont des mesures **de laboratoire** (réseau et processeur simulés), pas des téléphones réels : l'ordre de grandeur est fiable, pas le chiffre exact sur ton téléphone.
- Les bibliothèques Firebase (chargées depuis les serveurs de Google) ne sont **pas** incluses : elles étaient injoignables et ont été remplacées par un faux objet, de la même façon avant et après.
- Les vidéos d'intro ne sont pas comptées (identiques avant et après).
- Aucun test de charge (nombre de personnes en même temps).
- Un visiteur dont le fichier de langue arrive après l'ouverture voit brièvement le texte en français avant la bascule (en général le fichier arrive avant : il est demandé en même temps que le script principal). Avant cette étape, ce visiteur voyait déjà le français jusqu'à l'exécution du script principal.
- Hors ligne, une langue **jamais ouverte avant** ne peut pas être choisie (message clair) ; une langue déjà utilisée reste disponible grâce au cache.

### 8. Coût Firestore et serveur

- Les tâches automatiques tournent **1 fois par jour** (6 h et 8 h) : compatible avec la formule gratuite Vercel.
- Les files de paiement (SasPay) sont lues par **pages limitées** (3 à 5 pages) : coût de lecture borné.
- Le rapport financier lit au maximum **5 000 lignes** du relevé : coût borné.
- L'onglet **Bénéfices** lit au maximum **3 000 commandes** (période choisie) ; seul le choix « Tout (peut être lent) » relit toute la collection.
- Le réglage « services par pays » est lu **une fois par minute au plus** par le serveur (mémoire de 60 s).

---


### 7. Mise à jour « démarrage plus rapide » (v41) — mesures avant / après

Mesure dans Chromium, téléphone modeste (processeur ralenti 4 fois), réseau **4G lente** (1,6 Mb/s, 150 ms), médiane de 5 essais, vidéo d'ouverture servie comme en vrai. Les scripts Firebase ne sont pas comptés (le banc d'essai n'a pas accès à Internet) : le gain réel est donc au moins aussi grand.

| Mesure | Avant | Après |
|---|---|---|
| Application prête (DOMContentLoaded) | 4,6 s | **3,6 s** |
| Page entièrement chargée | 7,1 s | **6,3 s** |
| Données téléchargées à la 1re ouverture | 1 338 Ko | **1 181 Ko** |
| Sur réseau **3G** (400 Kb/s) : prêt / 1er élément principal | 18,3 s / 13,6 s | **15,0 s / 6,6 s** |

Sans la vidéo (visiteur non francophone ou téléphone qui la coupe) : prête en 3,0 s au lieu de 3,6 s, premier élément principal (le logo) en 1,5 s au lieu de 2,9 s.

Ce qui a changé (rien de visible côté dessin, tout est dans les tests `tests/perf-budget.test.js`) :

| Changement | Effet |
|---|---|
| Logo de l'écran d'ouverture : `logo-mark-480.webp` (480 × 224, 40 Ko) au lieu de `logo-mark.png` (720 × 335, 127 Ko). Même dessin (écart maximal 2/255 par couleur, invisible). `fetchpriority="high"`. L'ancien fichier reste en place. | −87 Ko ; apparaît 1,4 s plus tôt sur 4G lente. |
| Image d'accueil : `srcset` avec 600 / 800 / 1000 / 1200 px et `fetchpriority="low"` (dimensions réservées, pas de saut de page). | −20 à −45 Ko selon l'écran ; ne gêne plus le script principal. |
| Script principal `app.min.js` : `<link rel="preload" … fetchpriority="high">` dans l'en-tête. `tools/build.js` met maintenant à jour **toutes** les occurrences de `app.min.js?v=` / `app.min.css?v=`. | Le téléchargement démarre ~0,2 s plus tôt et passe avant les images. |
| Petite icône d'en-tête `icon-128-v2.png` (9,5 Ko) et icône d'onglet `favicon-48-v2.png` (2,5 Ko) ; la 192 px reste déclarée (Google, installation). | −26 Ko à l'ouverture. |
| Préparation de la connexion à `gstatic.com` **sans** « crossorigin » (les scripts Firebase n'en ont pas) en plus de l'existante. | Évite une connexion neuve (≈ 1 à 2 allers-retours réseau). Non mesurable en laboratoire. |
| Vidéo d'ouverture (≈ 310 Ko) : **non téléchargée** si la connexion est lente (2G/3G ou moins de 1,5 Mb/s). Le logo fixe s'affiche à la place. | −312 Ko sur réseau lent ; le script principal n'est plus ralenti. Sans effet sur iPhone / Firefox (pas d'information de connexion). |

À savoir : le service worker passe à `coeurnohboost-v41` ; il faut rouvrir l'application 2 fois après le dépôt.

**Pistes non faites (à décider ensemble)** : l'écran d'ouverture dure toujours 2,6 s (choix de marque : la durée est le plus gros délai fixe, on peut la réduire ou la limiter à la 1re ouverture du jour) ; scripts Firebase inutiles au démarrage (`app-check` ≈ 14 Ko non activé, `messaging` ≈ 19 Ko) ; minifier les 30 modules (gain mesuré seulement ≈ 50 Ko compressés) ; découper `script.js` (140 Ko compressés).

### 9. Mise à jour v42 — comptes inactifs récupérables, cartes cliquables, système « en ligne », référencement

**Ce qui a changé pour toi (admin)**

| Avant | Maintenant |
|---|---|
| Les cartes de la page **Statistiques** n'étaient que des chiffres. | Chaque carte est un **bouton** (aussi au clavier) : *Utilisateurs* → liste des utilisateurs ; *Nouveaux (7 jours)* → liste des utilisateurs ; *Commandes totales* → toutes les commandes ; *Commandes en attente* → commandes filtrées « En attente » ; *Chiffre d'affaires* → Bénéfices ; *Dépôts à valider* → Dépôts ; *Comptes archivés* → la liste des comptes archivés. |
| Onglet Commandes : liste unique. | **Puces de filtre** : Toutes / En attente / En cours / À vérifier / Terminées / Remboursées (lit les 400 plus récentes quand un filtre est choisi). |
| Un compte absent 30 jours était **détruit** (connexion + données) : la personne ne pouvait plus se reconnecter. | Le compte est **mis de côté (archivé)**, jamais détruit. La personne se reconnecte avec le **même e-mail / même Google / même mot de passe** et retrouve **toutes ses informations**, avec un message « Bon retour ! ». |

**Comment fonctionne l'archivage** (`api/_lib/inactive-cleanup.js`, tâche quotidienne existante, aucune nouvelle fonction Vercel) :

| Étape | Détail |
|---|---|
| 1. Copie | Fiche personnelle, profil public, publications, appareils et contacts d'urgence sont copiés dans `archived_accounts/{uid}` (collection **réservée au serveur** : les règles Firestore refusent déjà tout accès aux téléphones, **aucun changement de règles**). |
| 2. Drapeau | Le compte de connexion reste ; on lui pose le drapeau `archived` (les autres droits du compte sont conservés). Le nettoyage saute les comptes déjà archivés. |
| 3. Retrait | Les originaux sont retirés de l'application (la fiche personnelle en dernier). Si ce retrait échoue, le drapeau et la copie sont annulés : le compte reste comme avant. |
| Effacé pour la vie privée (jamais copié) | Position en direct, historique de position, session SOS, liens de partage de position, présence. |
| Jamais touché | Commandes, mouvements d'argent, notifications, partages reçus, contacts d'urgence des autres. |
| Garde-fous inchangés | Jamais archivé : l'admin, un compte récent ou vu depuis moins de 30 jours, un solde > 0, un site / entreprise / formation / site client. **Nouveau** : un compte trop gros (plus de 1 500 éléments à copier) est laissé tel quel. Le **premier passage reste à blanc**. |

**Comment le compte revient** (`restoreAccount`) : à l'ouverture, si la fiche manque (ou si le compte porte encore le drapeau), l'application demande au serveur `POST /api/payment-initiate {provider:'restore'}` (limité à 12 par heure, seulement pour **son propre** compte). Le serveur remet tout en place **sans écraser** une donnée vivante ; la seule fiche remplacée est une fiche vide recréée automatiquement après l'archivage. Puis il retire le drapeau et efface la copie. Trois filets : `auth-guard.js` (`ensureUserDoc`, `healAccount`) récupère **avant** de créer une fiche vide et ne crée **rien** en cas d'erreur réseau ; `recordSeen` récupère aussi si le jeton porte le drapeau.

**Page admin → Utilisateurs → « Comptes archivés »** : liste (100 plus récents) avec **Récupérer** (à la main) et **Supprimer définitivement** (copie + compte de connexion ; refusé pour un compte non archivé et pour l'admin). Actions serveur `archives_list`, `archive_restore`, `archive_purge` dans `payment-webhook.js` (réservées à l'admin).
**« Supprimer mon compte »** (Paramètres) efface aussi la copie d'archive. `legal.html` (Confidentialité) décrit ce fonctionnement.

**Système « en ligne »** (`api/_lib/online-now.js`, aucune nouvelle fonction Vercel)

| Où | Ce que tu vois |
|---|---|
| Admin → Statistiques | Carte **« En ligne maintenant »** (nombre + « X dans l'heure · Y en 24 h »), mise à jour **toute seule toutes les 30 s** ; un clic ouvre la liste des personnes en ligne. |
| Admin → Utilisateurs | En haut : **« En ligne maintenant : N »** avec la liste (nom, e-mail, pays, « Actif il y a 1 min », bouton Message) et bouton Actualiser. Dans toute la liste, une pastille verte **« En ligne »** apparaît à côté du nom des personnes connectées. |
| Application (accueil connecté) | Petite pastille **« 1 284 membres en ligne »** (8 langues), rafraîchie toutes les 90 s tant que l'application est visible. **Seul le nombre** est donné aux membres, jamais de noms. Affichée à partir de **3** personnes en ligne (pour ne pas afficher « 1 en ligne », c'est soi-même). Réglage : `CN_ONLINE_MIN_SHOWN` dans `script.js`. |
| Profil d'un vendeur / messagerie | Inchangé : « En ligne » / « Vu il y a… » (même règle des 5 minutes). |

Comment ça marche : chaque téléphone dont l'application est **visible** écrit un battement `lastActiveAt` toutes les 2 min dans `presence/{uid}` (même document qu'avant, **aucun changement de règles Firestore**). Une personne est « en ligne » si son dernier battement a moins de **5 minutes**. Nouveau : **application en arrière-plan = pas de battement** (donc plus compté en ligne, et moins de batterie / d'écritures) ; au retour dans l'application, battement immédiat. Le comptage est fait par le **serveur** (comptage groupé : 1 lecture facturée pour 1 000 personnes comptées) et gardé **20 s en mémoire** : coût de lecture minuscule, même avec beaucoup de monde. La liste nominative est donnée **uniquement à l'admin** (`online_now` dans `payment-webhook.js`) ; le public passe par `payment-initiate {provider:'online'}` (nombres seulement, personne connectée requise, sans limite par personne pour ne pas coûter une écriture à chaque appel).
**Limite honnête** : seules les personnes **connectées à un compte** sont comptées (un visiteur sans compte n'écrit rien) ; le nombre est une photo à 5 minutes près, pas à la seconde.

**Référencement** : il était déjà complet (balises, Open Graph, données structurées Organisation / Application / FAQ, plan du site avec `hreflang`, guide en 5 langues, robots.txt). Ajouts : l'allemand, le swahili et le lingala dans les langues déclarées (`inLanguage`), `og:locale` allemand et swahili, date du plan du site mise à jour. **Aucun site ne peut promettre d'être « premier partout »** : ce qui compte maintenant, c'est de déclarer le site dans **Google Search Console** et **Bing Webmaster** (envoyer `sitemap.xml`), et d'avoir des liens depuis d'autres sites.

**Tests** : `tests/inactive-archive.test.js` (10 tests : archivage, retour à l'identique, aucun écrasement, garde-fous, compte trop gros, filet `recordSeen`, actions admin, branchements) et `tests/online-now.test.js` (5 tests : fenêtre de 5 min, heure / 24 h, mémoire de 20 s, liste admin, branchements et confidentialité). Essais réels dans Chromium : cartes (clic + clavier), filtres de commandes, retour de compte (récupéré / rien à récupérer / erreur réseau), carte et liste « en ligne » de l'admin, pastille « membres en ligne » (visible à 1 284, cachée à 2) — cet essai a révélé et fait corriger un vrai défaut (mauvaise source du jeton) que les tests simulés ne voyaient pas.

À savoir : le service worker passe à `coeurnohboost-v42` ; il faut rouvrir l'application 2 fois après le dépôt (et la page admin aussi). **Limites** : les parrainages (filleuls) d'un compte archivé disparaissent des comptes le temps de l'archivage ; un compte archivé qui n'a jamais de fiche personnelle (inscription jamais finie) n'est pas touché.

## Partie 10 : Design System

Toutes les couleurs de l'application passent par des variables CSS (fichier `style.css`, bloc `:root`). Le mode clair et le mode sombre les redéfinissent : aucun texte ne peut se retrouver « blanc sur blanc ». Pour changer une couleur, on change la variable, jamais une valeur écrite en dur.

### Palette officielle

| Rôle | Variable | Valeur | Où l'utiliser |
|---|---|---|---|
| **Bleu d'action** | `--action` | `#1d4f91` | **Rare** : boutons pleins principaux, liens, anneau de focus au clavier, moyen de paiement choisi. Nulle part ailleurs. |
| Bleu d'action (survol / appui) | `--action-hover` / `--action-press` | `#173f75` / `#12335e` | États du bouton principal. |
| **Ardoise** | `--slate` | `#28374f` | Icônes, flèches, avatars, boutons secondaires (lettres du logo). |
| **Bleu nuit** | `--night` | `#14263f` | Sélections, onglets actifs. |
| **Orange** | `--accent` | `#f39c1f` | Globe du logo, bouton « Vendre » de la boutique, barre du bas active. |
| Rouge (marque) | `--red` | `#d7263d` | « MULTI SERVICES » et alertes. |
| Texte | `--ink` / `--ink-2` / `--muted` | `#141a26` / `#38435a` / `#5d6779` | Titres, texte, texte discret. |
| Fonds | `--bg` / `--soft` / `--soft-2` | `#f2f3f5` / `#f3f5f9` / `#e8ecf3` | Page, cartes douces. |
| Traits | `--line` / `--line-2` | `#e2e6ee` / `#cfd6e2` | Bordures. |

### Typographie, formes, ombres

| Élément | Valeur | Remarque |
|---|---|---|
| Texte courant | `--font` : **CN Inter** (Inter hébergée avec l'application), puis polices du système | Poids 400, 500, 600, 700. Aucun chargement externe : affichage rapide et hors ligne. |
| Titres | `--font-head` : **CN Display** (Inter Display) | Poids 600 et 700. |
| Titres éditoriaux (guide, pages publiques) | `--font-title` : **CN Serif** | Usage limité. |
| Arrondi des cartes | `--radius` : 16 px | Boutons et champs un peu plus petits, même famille. |
| Ombres | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Sobres, jamais colorées. Plus profondes en mode sombre. |
| Teintes d'état | `--tint-blue`, `--tint-green`, `--tint-amber`, `--tint-red` (fond, texte, bordure) | Succès = vert, attention = ambre, erreur = rouge, information = ardoise. |

### Mode clair et mode sombre

Le mode sombre est défini dans `style.css` par `html[data-theme="dark"]` : il redéfinit les mêmes variables, sans toucher aux composants. Toute nouvelle couleur doit donc être **une variable avec sa version sombre**.

### Règles absolues

- **Pas de dégradés** : couleurs pleines.
- **Pas d'emoji dans l'interface** : on utilise des icônes SVG (trait de 2 px, extrémités arrondies, même famille partout). Les drapeaux de pays du sélecteur de langue sont les seules images de ce type.
- **Les icônes et images que tu envoies depuis l'admin ne sont jamais recolorées** : `admin-icons.js` et l'affichage de ces images ne se modifient pas.
- Un seul bleu d'action par écran pour le bouton principal ; le reste en ardoise.

### Composants

| Composant | Où c'est défini | Remarque |
|---|---|---|
| Boutons (`.btn`, `.btn-primary`, `.btn-outline`, `.btn-sm`) | `style.css`, `polish.css`, `admin-pro.css` | Un plein par zone d'action, les autres en contour ardoise. |
| Cartes (`.order-box`, `.admin-row`, `.adm-fin-card`) | `style.css`, `admin-pro.css` | Bord 1 px `--line`, coins arrondis. |
| Formulaires (`.field`, `.text-input`) | `style.css` | Libellé au-dessus, aide en gris. |
| Tableaux (`.adm-fin-table`) | `admin-pro.css` | Défilement horizontal sur petit écran, chiffres alignés à droite. |
| Barre du bas, menu, fenêtres | `menu-pro.css`, `menu-pro.js` | Onglet actif en bleu nuit, repère orange. |
| Notifications | `push-center.js`, `showToast` dans `script.js` | Messages courts en français simple. |

### Marque

- Nom : **COEURNOH UNIVERSE** (jamais un autre nom).
- Logo : `icon-512-v2.png` (l'icône de l'application) et les lettres du logo en ardoise avec le globe orange. Le logo existant est conservé tel quel.
- Ton des messages : tutoiement, phrases courtes, français simple.

### Accessibilité

- Anneau de focus visible au clavier en bleu d'action (`--action-ring`).
- Module `a11y-pro.js` : libellés des boutons, navigation au clavier, respect des préférences de mouvement réduit.
- Contrastes : texte `#141a26` sur fonds clairs ; les teintes d'état (succès, alerte, erreur) associent un fond doux à un texte foncé lisible.
