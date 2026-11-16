# Rapport de performance

Les **poids** ci-dessous sont mesurés sur les fichiers réels du dépôt (compression gzip niveau 9). Les **temps** de chargement sur téléphone ne sont **pas** mesurés (l'environnement de travail ne peut pas ouvrir l'application sur un vrai réseau mobile) : seuls des calculs théoriques sont donnés, et ils sont signalés comme tels.

## 1. Poids mesurés

| Fichier | Taille brute | Compressé (gzip) |
|---|---|---|
| `app.min.js` (traductions + catalogue + script + polish + menu + notifications) | 1 307 062 o | **348 184 o** |
| `app.min.css` | 176 182 o | **33 103 o** |
| `index.html` | 191 838 o | **36 900 o** |
| `sw.js` (service worker) | 15 638 o | 5 784 o |
| *dont* `translations.js` (inclus dans `app.min.js`) | 462 606 o | 125 346 o |

**Premier chargement** (HTML + CSS + JS) : environ **418 000 octets compressés (≈ 408 Ko)**, hors bibliothèques Firebase chargées depuis les serveurs de Google.

Calcul théorique du transfert seul : ≈ 3,3 s à 1 Mbit/s, ≈ 8 s à 400 kbit/s. Ce n'est **pas** une mesure.

**Médias les plus lourds** : `splash-v2.mp4` 320 Ko, `icon-512-v2.png` et `icon-512-maskable-v3.png` 226 Ko chacune, `intro-dark.mp4` 217 Ko, `intro-light.mp4` 133 Ko, `logo-mark.png` 127 Ko, `og-image.jpg` 93 Ko.

## 2. Ce qui accélère déjà les visites suivantes

| Mécanisme | Effet |
|---|---|
| `app.min.js` / `app.min.css` : cache d'**1 an** (`immutable`), nom versionné par empreinte dans `index.html` | Après la 1re visite, rien à retélécharger tant que le fichier ne change pas. |
| Images, polices : cache 7 jours + mise à jour en arrière-plan | Affichage immédiat, rafraîchi discrètement. |
| Vidéos d'intro : cache d'1 an | Pas de retéléchargement. |
| `sw.js` et `manifest.json` : toujours revérifiés | Les mises à jour arrivent (c'est pourquoi on change `CACHE_NAME` à chaque livraison). |
| Service worker (PWA) | L'application démarre depuis la mémoire du téléphone, même avec un réseau faible. |
| `/api/*` : jamais en cache | Les soldes et les statuts sont toujours à jour. |
| Compression, `defer` sur le script principal, repli automatique si le fichier regroupé échoue | Affichage sans blocage, avec secours. |

## 3. Points faibles réels

| Point | Pourquoi c'est un souci | Gain possible |
|---|---|---|
| **Les 7 langues sont chargées en même temps** (125 Ko compressés de textes) alors qu'une seule est utilisée | ≈ 100 Ko compressés inutiles à chaque premier chargement. | **≈ 24 %** du JS. Chargement à la demande de la langue choisie. Risque : des modules ajoutent leurs propres textes dans les langues ; à traiter avec soin (voir feuille de route). |
| `script.js` est un seul gros bloc | Tout est analysé même si on n'ouvre qu'un service. | Découpage par service (chargement à la demande). Chantier important. |
| `index.html` de 37 Ko compressés | Contient l'écran de tous les services. | Charger les écrans rares à la demande. |
| Onglet **Bénéfices** de l'admin lit toute la collection `orders` | Le coût (lectures Firestore + temps) grandit avec le nombre de commandes. | Lire par période ou tenir des compteurs. |
| Images PNG de 226 Ko pour l'icône | Lourdes pour une icône. | Version WebP / PNG optimisée (sans changer le dessin du logo). |
| Aucune mesure réelle (Lighthouse, vitesse sur 3G) | On ne sait pas encore les vrais temps sur ton réseau. | Faire une mesure Lighthouse depuis un ordinateur et la communiquer. |

## 4. Coût Firestore et serveur

- Les tâches automatiques tournent **1 fois par jour** (6 h et 8 h) : compatible avec la formule gratuite Vercel.
- Les files de paiement (SasPay) sont lues par **pages limitées** (3 à 5 pages) : le coût de lecture est borné.
- Le rapport financier lit au maximum **5 000 lignes** du relevé : coût borné.
