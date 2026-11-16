# Coeurnoh Universe — Documentation du projet

Coeurnoh Universe est une plateforme multiservices (réseaux sociaux, sites web, entreprises, factures, emploi, académie, immobilier, voyages, réservations, événements, concours, alertes, boutique, portefeuille). Elle fonctionne comme une application installable sur téléphone (PWA), sur https://coeurnohuniverse.com/.

## Les documents

| Document | À quoi il sert |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Comment l'application est construite : pages, fonctions serveur, base de données, argent. |
| [INSTALLATION-DEPLOIEMENT.md](INSTALLATION-DEPLOIEMENT.md) | Comment mettre à jour l'application et vérifier qu'elle marche. |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Les couleurs, icônes et règles visuelles officielles de la marque. |
| [SECURITE.md](SECURITE.md) | Ce qui protège l'application, les failles trouvées et corrigées, les risques qui restent. |
| [PERFORMANCE.md](PERFORMANCE.md) | Les poids et les temps mesurés, et les améliorations possibles. |
| [AUDIT-ET-MATRICE.md](AUDIT-ET-MATRICE.md) | Le grand prompt, partie par partie : ce qui est fait, partiel ou à faire, et le tableau de tous les services. |
| [TESTS.md](TESTS.md) | Les tests réellement exécutés, ce qu'ils vérifient et ce qu'ils ne vérifient pas. |
| [A-CONFIGURER.md](A-CONFIGURER.md) | Les éléments qui dépendent de comptes extérieurs (clés, règles Firestore, facturation Firebase). |
| [FEUILLE-DE-ROUTE.md](FEUILLE-DE-ROUTE.md) | Ce qui reste à construire, dans l'ordre conseillé. |

## Les 5 règles qu'on ne casse jamais

1. **L'argent se calcule et s'écrit côté serveur**, dans une transaction, avec une ligne dans le relevé `wallet_transactions`. Jamais depuis le navigateur.
2. **Un paiement est « réussi » seulement après confirmation du fournisseur** (signature de la notification, puis revérification auprès du fournisseur).
3. **Aucun numéro de carte n'est stocké ni affiché** par l'application.
4. **`app.min.js`, `app.min.css` et `index.html` vont toujours ensemble** et ne se modifient jamais à la main : on lance `node tools/build.js`.
5. **Vercel gratuit : 12 fonctions maximum** dans `api/` (déjà 12). Une nouvelle fonction se range dans une fonction existante.
