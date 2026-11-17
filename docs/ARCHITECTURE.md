# Architecture

## Vue d'ensemble

- **Application** : JavaScript simple (sans framework), installable (PWA), hébergée sur **Vercel** (formule gratuite).
- **Données et comptes** : **Firebase** (Authentication + Firestore). Le navigateur lit Firestore avec les règles de sécurité ; le serveur écrit tout ce qui touche à l'argent.
- **Fichiers du front** (à la racine) : `index.html`, `script.js` (cœur), et des modules « pro » par service (`menu-pro.js`, `payments-pro.js`, `invoice-pro.js`, `academy-*.js`, `site-*.js`, …). Ils sont regroupés par `tools/build.js` dans `app.min.js` et `app.min.css`.
- **Administration** : `admin.html` + `admin.js` + `admin-pro.css` (page séparée, réservée au compte administrateur).
- **Serveur** : dossier `api/` (12 fonctions Vercel) et `api/_lib/` (la logique partagée).

## Les 12 fonctions serveur (`api/`)

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

## Modules serveur importants (`api/_lib/`)

- `security.js` : vérification de l'identité (jeton Firebase), limitation du nombre de requêtes, journal.
- `payments-core.js` : opérations d'argent. Chaque opération est **une transaction Firestore** : lire d'abord, écrire ensuite, solde + ligne de relevé ensemble.
- `wallet-ledger.js` : écrit chaque mouvement dans `wallet_transactions` avec le solde après opération.
- `balance-guard.js` : compare chaque solde au dernier mouvement du relevé ; détecte aussi les achats « de son propre produit » (ancienne faille).
- `saspay.js` : SasPay (pays, devises, taux de change, session de paiement, vérification).
- `care.js` : sauvegarde exportable, journal d'activité de l'administrateur, assistance.
- `topup-seal.js` : sceau qui empêche de modifier une demande de recharge.
- `public-pages.js`, `site-*.js`, `guide-data.js` : pages publiques et sites générés (référencement).

## Où va l'argent

1. **Recharge** : le client paie chez le fournisseur → la notification arrive sur `payment-webhook.js` → le serveur **revérifie** auprès du fournisseur → crédite **une seule fois** (verrou `payment_claims`) → ligne `topup_*` dans le relevé.
2. **Achat par solde** (cours, billets, concours, livres, domaines, commandes) : une transaction débite l'acheteur, crédite le vendeur (85 %) et l'administrateur (15 %), et écrit les lignes du relevé.
3. **Retrait** : le solde est débité à la demande ; l'administrateur marque « payé » ou « refusé » — **le serveur** applique et ne rembourse qu'une seule fois.
4. **Contrôle** : chaque nuit le serveur compare les soldes au relevé ; l'onglet Bénéfices de l'admin donne le **rapport financier** (recharges, retraits, mouvements internes, rapprochement avec les demandes de recharge) ; si une recharge a été créditée plusieurs fois, il nomme le compte et permet de retirer le surplus une seule fois (`fin_correct`).

## Collections Firestore principales

`users`, `wallet_transactions`, `topup_requests`, `payment_claims`, `withdrawal_requests`, `domain_purchase_requests`, `orders`, `contests`, `contest_entries`, `events`, `event_tickets`, `courses`, `course_enrollments`, `mini_sites`, `notif_logs`, `client_errors`, `app_config`, `admin_audit` (et une centaine d'autres collections de contenu).

## Les langues

`translations.js` centralise tous les textes : français, anglais, espagnol, italien, portugais (complets), **Kiswahili et Lingála (écrans essentiels, bêta)**. Une clé non traduite s'affiche en français dans ces deux dernières langues.
