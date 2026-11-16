# Installation et déploiement

## Mettre à jour l'application (méthode habituelle, depuis le téléphone)

1. Dépose les fichiers reçus dans le dépôt GitHub **`main`**, chacun dans son dossier : à la racine (à côté de `script.js`), dans `api/`, dans `api/_lib/`, dans `tests/`, dans `docs/`.
2. Vercel redéploie tout seul. Attends que le déploiement soit terminé (statut « Ready »).
3. **Ouvre l'application 2 fois** (la 1re fois elle télécharge la nouvelle version, la 2e l'active). Fais pareil pour la **page admin**.
4. Contrôle rapide : ouvre le menu → Portefeuille, puis l'admin → onglet Bénéfices → « Générer le rapport ».

> `index.html`, `app.min.js` et `app.min.css` se déposent **toujours ensemble**.

## Vérifier le projet sur un ordinateur (si tu en as un)

Prérequis : Node.js 20 ou plus. Aucune dépendance à installer pour les tests.

```
node tools/build.js           # reconstruit app.min.js, app.min.css et les empreintes de index.html
node tools/build.js --check   # vérifie que tout est à jour (échoue sinon)
node --test tests/*.test.js   # lance tous les tests (389 au dernier contrôle)
```

La vérification se lance aussi toute seule sur GitHub à chaque dépôt (fichier `ci.yml`, qui doit être rangé dans `.github/workflows/` pour être actif).

## À chaque livraison, on change les numéros de version

- `CACHE_NAME` dans `sw.js` (ex. `coeurnohboost-v35`) ;
- le numéro `V` dans `stability.js` et les `?v=` dans `auth-guard.js`, `menu-pro.js`, `messaging-pro.js`, `script.js`, `admin.html` ;
- le test `tests/admin-icons.test.js` qui vérifie ces numéros.

Sans cela, les téléphones gardent l'ancienne version en mémoire.

## Premier déploiement (nouvelle installation)

1. Créer un projet **Firebase** (Authentication : e-mail + Google ; Firestore).
2. Créer un projet **Vercel** relié au dépôt GitHub (branche `main`).
3. Ajouter les **variables d'environnement** listées dans [A-CONFIGURER.md](A-CONFIGURER.md).
4. Coller les **règles Firestore** (par petits morceaux, jamais en fichier) et publier.
5. Déclarer le domaine `coeurnohuniverse.com` dans Vercel.
6. Déclarer chez chaque fournisseur de paiement l'adresse de notification : `https://coeurnohuniverse.com/api/payment-webhook?provider=<nom>` (`saspay`, `cryptomus`, `mbotepay`, `optgateway`).

## Retour en arrière

- **Code** : dans Vercel → Deployments → choisir la version précédente → « Promote to Production ». C'est immédiat.
- **Données** : l'admin peut exporter une sauvegarde par collection (onglet « Exploitation : assistance, sauvegarde, journal » de l'admin, fourni par `care.js`). Pour des sauvegardes automatiques complètes de Firestore, il faut la formule Firebase **Blaze** (voir [A-CONFIGURER.md](A-CONFIGURER.md)).
