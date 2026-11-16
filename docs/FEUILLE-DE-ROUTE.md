# Feuille de route

Ce qui reste à construire, **dans l'ordre conseillé**. Chaque point dit pourquoi, ce que ça demande, et le risque.

| # | Chantier | Pourquoi | Ce que ça demande | Risque / remarque |
|---|---|---|---|---|
| 1 | **Contrôle des règles Firestore** | Tout le reste de la sécurité s'appuie dessus ; je ne les ai jamais vues. | Relecture par petits morceaux à coller. | Aucun, c'est de la lecture. |
| 2 | **Essais réels des paiements** | Les tests actuels imitent les fournisseurs. | Toi : essai en mode test chez chacun, puis un petit essai réel. | Aucun achat test demandé, aucun paiement simulé. |
| 3 | **Activer App Check** | Empêche les scripts pirates de parler à Firestore. | Clé reCAPTCHA v3 dans `app-check.js`, observation, « Appliquer ». | Appliquer trop tôt peut bloquer de vrais utilisateurs : observer d'abord. |
| 4 | **Ranger `ci.yml` dans `.github/workflows/`** et supprimer `immo-travel-pro (1).js` | Le contrôle automatique ne se lance pas aujourd'hui ; le doublon prête à confusion. | Déplacer / supprimer deux fichiers sur GitHub. | Très faible. |
| 5 | **Rôles et permissions** (modérateur, comptable, support) | Aujourd'hui un seul administrateur peut tout. Validation à deux pour les gros retraits. | Changement des règles Firestore + serveur + admin. | Élevé : touche l'argent et les règles ; à faire avec tests. |
| 6 | **Disponibilité des services par pays** | « Ne suppose pas que tous les services sont disponibles partout » (Partie VI). | Réglage par pays dans l'admin (service actif / inactif), lu par l'application. | Moyen. |
| 7 | **Chargement à la demande des langues** | ≈ 100 Ko compressés (≈ 24 % du JS) économisés au premier chargement. | Ne charger que la langue choisie ; traiter les modules qui ajoutent des textes dans toutes les langues. | Moyen : risque de textes manquants → tests de non-régression. |
| 8 | **Tests de bout en bout dans un navigateur** | Rejouer connexion → recharge → achat → retrait. | Environnement relié à Firebase de test (l'environnement actuel ne l'atteint pas). | Demande un projet Firebase de test séparé. |
| 9 | **Relecture Kiswahili / Lingála** par un locuteur natif, puis extension aux autres écrans | Les textes sont en bêta (repli français). | Une relecture humaine. | — |
| 10 | **Arabe / droite-à-gauche et autres langues** | Ouverture à d'autres marchés. | Mise en page RTL + traductions. | Élevé pour le visuel. |
| 11 | **Mesure de performance réelle** (Lighthouse, réseau lent) | Aujourd'hui seuls les poids sont connus. | Mesure depuis un ordinateur, résultats à me transmettre. | — |
| 12 | **Onglet Bénéfices : lecture par période** | Il lit toute la collection `orders` ; coût croissant. | Requête par date ou compteurs. | Faible. |
| 13 | **Retirer `unsafe-inline` de la CSP** | Meilleure protection contre le XSS. | Sortir les scripts et styles en ligne dans des fichiers. | Moyen : beaucoup de pages touchées. |
| 14 | **Sauvegardes automatiques Firestore** | Aujourd'hui, export manuel seulement. | Firebase **Blaze** + export planifié. | Coût de la formule payante. |
| 15 | **Connexion par SMS, puis Apple / Facebook / Microsoft** | **Reportés à ta demande.** | SMS : Firebase Blaze. | Ne pas démarrer sans ton feu vert. |
| 16 | **Découper `script.js`** par service | Premier chargement plus léger. | Gros chantier de refonte. | Élevé. |
| 17 | **Environnements séparés** (test / production) | Essayer sans toucher aux vrais comptes. | Second projet Firebase + second projet Vercel. | Lié au point 8. |

## Règles pour la suite

- **L'argent d'abord** : tout nouveau mouvement d'argent = transaction serveur + ligne de relevé + test.
- **Pas de nouvelle fonction dans `api/`** (limite Vercel gratuite de 12) : ranger dans une fonction existante.
- **Une livraison = une version** : on change `CACHE_NAME` et les numéros de version, on relance `node tools/build.js`, puis les tests.
