# Design System — Coeurnoh Universe

Toutes les couleurs de l'application passent par des variables CSS (fichier `style.css`, bloc `:root`). Le mode clair et le mode sombre les redéfinissent : aucun texte ne peut se retrouver « blanc sur blanc ». Pour changer une couleur, on change la variable, jamais une valeur écrite en dur.

## Palette officielle

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

## Typographie, formes, ombres

| Élément | Valeur | Remarque |
|---|---|---|
| Texte courant | `--font` : **CN Inter** (Inter hébergée avec l'application), puis polices du système | Poids 400, 500, 600, 700. Aucun chargement externe : affichage rapide et hors ligne. |
| Titres | `--font-head` : **CN Display** (Inter Display) | Poids 600 et 700. |
| Titres éditoriaux (guide, pages publiques) | `--font-title` : **CN Serif** | Usage limité. |
| Arrondi des cartes | `--radius` : 16 px | Boutons et champs un peu plus petits, même famille. |
| Ombres | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Sobres, jamais colorées. Plus profondes en mode sombre. |
| Teintes d'état | `--tint-blue`, `--tint-green`, `--tint-amber`, `--tint-red` (fond, texte, bordure) | Succès = vert, attention = ambre, erreur = rouge, information = ardoise. |

## Mode clair et mode sombre

Le mode sombre est défini dans `style.css` par `html[data-theme="dark"]` : il redéfinit les mêmes variables, sans toucher aux composants. Toute nouvelle couleur doit donc être **une variable avec sa version sombre**.

## Règles absolues

- **Pas de dégradés** : couleurs pleines.
- **Pas d'emoji dans l'interface** : on utilise des icônes SVG (trait de 2 px, extrémités arrondies, même famille partout). Les drapeaux de pays du sélecteur de langue sont les seules images de ce type.
- **Les icônes et images que tu envoies depuis l'admin ne sont jamais recolorées** : `admin-icons.js` et l'affichage de ces images ne se modifient pas.
- Un seul bleu d'action par écran pour le bouton principal ; le reste en ardoise.

## Composants

| Composant | Où c'est défini | Remarque |
|---|---|---|
| Boutons (`.btn`, `.btn-primary`, `.btn-outline`, `.btn-sm`) | `style.css`, `polish.css`, `admin-pro.css` | Un plein par zone d'action, les autres en contour ardoise. |
| Cartes (`.order-box`, `.admin-row`, `.adm-fin-card`) | `style.css`, `admin-pro.css` | Bord 1 px `--line`, coins arrondis. |
| Formulaires (`.field`, `.text-input`) | `style.css` | Libellé au-dessus, aide en gris. |
| Tableaux (`.adm-fin-table`) | `admin-pro.css` | Défilement horizontal sur petit écran, chiffres alignés à droite. |
| Barre du bas, menu, fenêtres | `menu-pro.css`, `menu-pro.js` | Onglet actif en bleu nuit, repère orange. |
| Notifications | `push-center.js`, `showToast` dans `script.js` | Messages courts en français simple. |

## Marque

- Nom : **COEURNOH UNIVERSE** (jamais un autre nom).
- Logo : `icon-512-v2.png` (l'icône de l'application) et les lettres du logo en ardoise avec le globe orange. Le logo existant est conservé tel quel.
- Ton des messages : tutoiement, phrases courtes, français simple.

## Accessibilité

- Anneau de focus visible au clavier en bleu d'action (`--action-ring`).
- Module `a11y-pro.js` : libellés des boutons, navigation au clavier, respect des préférences de mouvement réduit.
- Contrastes : texte `#141a26` sur fonds clairs ; les teintes d'état (succès, alerte, erreur) associent un fond doux à un texte foncé lisible.
