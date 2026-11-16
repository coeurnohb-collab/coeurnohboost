# Rapport des tests réellement exécutés

**Commande** : `node --test tests/*.test.js` (Node.js 20, aucune dépendance à installer).
**Dernier résultat complet avant les documents** : **392 tests sur 392 réussis**, répartis dans **47 fichiers**. La vérification finale est relancée avant livraison (voir la fin de ce document).
Les tests se lancent aussi tout seuls sur GitHub à chaque dépôt (`ci.yml`, à ranger dans `.github/workflows/`).

## Comment les tests sont faits

- Les fonctions serveur sont chargées avec de **fausses** versions de Firebase, de la sécurité et des notifications.
- Une **fausse base Firestore en mémoire** imite les lectures, les écritures, les filtres et les **transactions avec versions** (rejeu en cas de conflit), pour vérifier les doubles clics et les rejeux.
- Les textes du front (`translations.js`) sont exécutés dans un bac à sable isolé.

## Ce qui est couvert

| Domaine | Fichiers | Tests | Ce qui est vérifié |
|---|---|---|---|
| **Argent et paiements** | `admin-requests`, `saspay`, `payment-webhook`, `optgateway`, `mobile-money-opt`, `pay-speed`, `pay-flow`, `payment`, `self-purchase`, `balance-guard`, `saspay-queue`, `panel-wd` | **154** | Opérations admin (retraits, domaines, dépôts) appliquées **une seule fois**, remboursements uniques, rapport financier et CSV, signatures des notifications, rejeu d'une même notification sans double crédit, taux de change, file SasPay de plus de 100 paiements, achat de son propre produit refusé, contrôle des soldes, retraits vendeurs. |
| **Sécurité et intégrité** | `xss-audit`, `safe-http`, `integrity`, `care` | **30** | Aucun texte saisi inséré sans protection, adresses internes refusées, secrets chiffrés, fichiers valides, traductions complètes, boutons reliés à une fonction, limite de 12 fonctions Vercel, en-têtes de sécurité non affaiblis, assistance (demandes limitées à 5 en cours, droits), export personnel sans secrets. |
| **Messagerie et notifications** | `messaging`, `notifications`, `notification-click`, `message-notification`, `push-guide`, `monitoring` | **58** | Envoi, lecture, clic sur une notification, guide d'activation des notifications (une seule demande de permission), App Check (reCAPTCHA v3) et collecte des erreurs. |
| **Académie et IA** | `academy-ai`, `academy-quiz`, `academy-trial`, `academy-v2`, `study-planner`, `ai-spend` | **42** | Génération de cours, quiz, essai gratuit, planning d'étude, plafond de dépense IA. |
| **Sites et pages publiques** | `render-site`, `render-business`, `site-owner`, `site-system`, `site-panel`, `site-panel-render`, `site-stats`, `share-page`, `invoice-page` | **39** | Génération des sites, pages d'entreprise, panneau propriétaire, statistiques, pages de partage, factures. |
| **Divers** | `earth-live`, `event-checkin`, `counters`, `my-activity`, `legacy-host`, `intro-splash`, `admin-icons`, `bundle`, `langues-afrique`, `connexion-pays` | **69** | Carte en direct, validation des billets, compteurs, activité, ancien domaine non indexé, écran d'intro, icônes admin et **numéros de version**, **fichier regroupé à jour**, Kiswahili / Lingála, liste des pays de recharge SasPay (alphabétique, sans pays favori). |

## Ce qui n'est PAS couvert (à lire)

| Manque | Conséquence |
|---|---|
| **Aucun test avec de vrais fournisseurs de paiement** (SasPay, Cryptomus, MBotePay, OPTGateway) | La logique est vérifiée avec des réponses imitées. Un essai réel en mode test chez chaque fournisseur reste à faire par toi. |
| **Aucun test de bout en bout dans un navigateur** (l'environnement de travail n'atteint pas Firebase) | Les parcours « je clique, je vois » ne sont pas rejoués automatiquement. |
| **Règles Firestore non testées** | Je n'ai pas le fichier de règles ; leur comportement n'est pas vérifié. |
| **Pas de test de charge** | On ne sait pas combien de personnes en même temps. |
| **Tailles d'écran et vrais téléphones** | Contrôlées par lecture du CSS, pas sur appareils. |
| **Kiswahili et Lingála** | Les textes sont testés pour la structure (clés, chiffres, repli en français) mais **pas relus par un locuteur natif**. |

## Vérification finale avant livraison

Les résultats exacts de la dernière exécution (build, `--check`, tests) sont donnés dans le message de livraison.
