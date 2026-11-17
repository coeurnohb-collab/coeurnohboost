# Rapport de sécurité

Ce rapport dit ce qui est **réellement en place** (vérifié dans le code), les failles **trouvées et corrigées** pendant ce travail, et les **risques qui restent**. Il ne prétend pas qu'une application est « inviolable » : ce serait faux.

## 1. Ce qui protège l'application aujourd'hui

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
| Journal | Les actions de l'administrateur sont journalisées ; les erreurs du navigateur sont collectées ; alerte si les erreurs explosent. | `care.js`, `run-scheduled-broadcasts.js` |

## 2. Failles trouvées et corrigées dans ce travail

| # | Faille | Risque | Correction |
|---|---|---|---|
| 1 | **Acheter son propre produit** créait de l'argent (le vendeur et l'acheteur étaient la même personne). | Création de solde. | Refus côté serveur + détection dans le contrôle nocturne + test `self-purchase`. |
| 2 | **Retraits, demandes de domaine et dépôts manuels** étaient validés par la page admin (le navigateur écrivait les soldes). Un double clic ou un rejeu pouvait **rembourser ou créditer deux fois**. | Double remboursement / double crédit. | Les 6 opérations (`wd_paid`, `wd_reject`, `dom_activate`, `dom_reject`, `dep_approve`, `dep_reject`) passent par le serveur : statut « en attente » obligatoire, montants lus dans la demande enregistrée, une seule application. 27 tests. |
| 3 | **Refus d'un domaine** : le client était remboursé mais le crédit de l'administrateur n'était **pas retiré**. | Argent créé à chaque refus. | Remboursement unique + écriture inverse du revenu admin (`site_domain_purchase_income_reversed`). |
| 4 | **Taux de change aberrant** (API de change en panne ou erronée) pouvait créditer un mauvais montant en SasPay. | Mauvais crédit. | Taux accepté seulement entre 0,4× et 2,5× du taux de secours ; sinon taux de secours ; sans taux → service indisponible (pas de devinette). |
| 5 | **File SasPay de plus de 100 paiements en attente** : les plus anciens n'étaient plus revérifiés. | Paiements réels non crédités. | Lecture par pages (jusqu'à 5 pages par statut), tests `saspay-queue`. |
| 6 | **Montant de retrait vendeur** non arrondi / sans plafond. | Montants invalides, centimes fantômes. | Arrondi à 2 décimales, minimum 0,01, maximum 1 000 000, refus si non numérique. |
| 7 | **Une recharge validée 7 fois** avec l'ancienne méthode (page admin) : une demande de 5 $ a crédité 35 $. Trouvée par le rapport financier du 17/11/2026. | 30 $ créés sans paiement sur un compte. | Plus possible : le serveur refuse une demande déjà validée (corrigé en n° 2). Pour l'existant : le rapport nomme le compte et un bouton retire le surplus **une seule fois** (jamais sous zéro, ligne `topup_correction` dans le relevé, journal admin). 5 tests. |

## 3. Risques qui restent (à connaître honnêtement)

| Risque | Gravité | Explication | Piste |
|---|---|---|---|
| **Règles Firestore non auditées par moi** | Haute | Le fichier de règles n'est pas dans le dépôt : je ne l'ai jamais vu, donc je ne peux **pas** certifier que le navigateur ne peut pas écrire un solde ou lire les données d'autrui. Tout le reste de la sécurité repose en partie sur elles. | Faire relire les règles (petits morceaux à coller, jamais en fichier). |
| **App Check inactif** | Moyenne | Sans lui, un script pirate qui connaît la configuration publique de Firebase peut parler à Firestore comme s'il était ton application (les règles Firestore restent la seule barrière). | Coller la clé reCAPTCHA v3 dans `app-check.js`, observer, puis appliquer. |
| Pas de **rôles** | Moyenne | Un seul compte administrateur, qui peut tout. Pas de modérateur limité, pas de « deux personnes pour valider un gros retrait ». | Voir la feuille de route. |
| CSP avec `unsafe-inline` | Moyenne | Les scripts et styles écrits dans les pages sont autorisés ; en cas de faille XSS, la CSP protège moins. Le test anti-XSS réduit ce risque. | Migrer les scripts en ligne vers des fichiers, puis retirer `unsafe-inline`. |
| Limitation des requêtes « laisse passer » si Firestore est indisponible | Faible | C'est un choix de disponibilité (mieux vaut ne pas bloquer tout le monde). | Acceptable ; surveiller. |
| Aucun test avec de **vrais** fournisseurs de paiement | Moyenne | Les tests simulent les réponses des fournisseurs ; ils ne remplacent pas un essai réel en mode test du fournisseur. | Essai en bac à sable fait par toi chez chaque fournisseur. |
| Pas de test de **bout en bout** dans un navigateur | Moyenne | L'environnement de travail n'atteint pas Firebase. | Voir TESTS.md. |
| Connexion par **SMS** et Apple / Facebook / Microsoft | — | Reportés à ta demande (le SMS demande Firebase Blaze). | Feuille de route. |
| Sauvegardes automatiques de Firestore | Moyenne | Seul l'export manuel existe (`care.js`). | Formule Blaze + export planifié. |
| Fichier en double `immo-travel-pro (1).js` | Faible | Non utilisé mais différent du vrai fichier : source de confusion. | Le supprimer du dépôt. |

## 4. Règles de sécurité à ne jamais casser

1. Ne jamais faire confiance à un montant envoyé par le navigateur.
2. Ne jamais marquer un paiement « réussi » sans confirmation du fournisseur.
3. Ne jamais stocker de numéro de carte.
4. Toute nouvelle opération d'argent = une transaction serveur + une ligne dans `wallet_transactions` + un test.
5. Toute nouvelle clé secrète = variable d'environnement Vercel, jamais dans un fichier du dépôt.
