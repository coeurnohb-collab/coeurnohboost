# Éléments extérieurs à configurer

Tout ce qui dépend d'un compte chez un fournisseur (clés, secrets, facturation) ne peut pas être fait dans le code. Voici la liste complète, relevée dans le code. Les clés se collent dans **Vercel → Settings → Environment Variables** (jamais dans un fichier du dépôt), puis on redéploie.

## 1. Variables d'environnement Vercel

### Indispensables

| Variable | À quoi elle sert |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Compte de service Firebase : permet au serveur de lire et écrire Firestore. |
| `CRON_SECRET` | Protège les 2 tâches automatiques (6 h et 8 h) : sans lui, n'importe qui pourrait les lancer. |

### Paiements (selon ceux que tu utilises)

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

### Services optionnels

| Variable | Service |
|---|---|
| `MTP_API_KEY` | Fournisseur des commandes de croissance réseaux sociaux (et alerte de solde bas). |
| `WEBPUSH_PRIVATE_KEY`, `WEBPUSH_SUBJECT` | Notifications push. |
| `RESEND_API_KEY`, `ALERT_EMAIL` | E-mails et alertes e-mail à l'administrateur. |
| `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` | Alerte WhatsApp (solde bas, erreurs). |
| `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL` | Maquettes générées par IA ; peut aussi servir à l'Académie. |
| `ANTHROPIC_API_KEY`, `ACADEMY_AI_MODEL`, `ACADEMY_AI_MODEL_GEMINI` | IA de l'Académie (cours, quiz, tuteur). |
| `TOPUP_SEAL_KEY` | Clé du sceau des demandes de recharge ; à défaut, le code utilise la clé privée Firebase. |

## 2. Sécurité Firebase

| Élément | État | Ce qu'il faut faire |
|---|---|---|
| **Règles Firestore** | Déjà en place chez toi. Je ne les ai **jamais vues** (elles ne sont pas dans le dépôt) : je ne peux pas les certifier. | Rien à m'envoyer. Si tu veux un contrôle, je te donne de petits morceaux à coller. |
| **App Check** | Prêt mais **inactif** (`SITE_KEY` vide dans `app-check.js`). | Créer une clé reCAPTCHA v3, la coller dans `app-check.js`, observer quelques jours dans la console Firebase, puis « Appliquer ». |
| **Domaines autorisés** (Authentication) | À vérifier. | `coeurnohuniverse.com` doit y figurer. |

## 3. Choses qui demandent la formule payante Firebase (Blaze)

| Fonction | Pourquoi |
|---|---|
| Connexion **par SMS** réelle | Reportée à ta demande ; Firebase facture l'envoi des SMS. |
| **Sauvegardes automatiques** de Firestore | L'export planifié demande Blaze. En attendant, l'export manuel de l'admin existe. |

## 4. Dépôt GitHub

| Action | Pourquoi |
|---|---|
| Ranger `ci.yml` dans `.github/workflows/ci.yml` | Pour que le contrôle automatique se lance vraiment à chaque dépôt (aujourd'hui il est à la racine, donc inactif). Son titre s'affiche aussi avec des caractères abîmés. |
| Supprimer `immo-travel-pro (1).js` | Doublon non utilisé qui diffère du vrai fichier `immo-travel-pro.js`. |

## 5. Essais réels à faire par toi (je ne peux pas les faire)

Un essai en **mode test** chez chaque fournisseur de paiement, puis un petit essai réel : recharge → solde crédité une seule fois → ligne dans le relevé → retrait demandé → marqué payé dans l'admin. Je ne te demande pas d'achat test et je ne simule jamais un paiement.
