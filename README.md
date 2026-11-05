# AR Game

Un personnage 3D en réalité augmentée, dans le navigateur du téléphone (iPhone et Android, sans installer d'application). On touche le sol pour poser le personnage, un joystick le fait marcher, et trois boutons déclenchent des actions sur cinq cubes qui réagissent avec de la physique.

**Jouer :** https://diakitemoussa-dot.github.io/ar-game/
(ouvrir dans Safari sur iPhone ou Chrome sur Android, autoriser la caméra, bouger doucement le téléphone, puis toucher le sol)

## Ce que fait le jeu

- **Poser le personnage :** un tap sur le sol détecté.
- **Joystick** (en bas à gauche) : le personnage marche, dans la direction où regarde la caméra. Animation `Walking` en marche, `Idle` à l'arrêt.
- **Boutons** (en bas à droite) : **Sauter**, **Frapper**, **Pousser**.
- **Cinq cubes** de tailles différentes (15 à 42 cm). Plus un cube est grand, plus il est lourd (de 0,7 kg à 15 kg).
  - Marcher dans un petit cube le pousse ; le gros cube résiste.
  - **Pousser** déplace un cube pendant l'animation. Le gros cube avance lentement.
  - **Frapper** fait culbuter les petits cubes. Les gros bougent à peine.
  - **Sauter** fait sautiller les petits cubes proches.
- **Ombres** du personnage et des cubes sur le sol.

## Technologie

| Rôle | Outil |
|---|---|
| Caméra et suivi du sol en AR | moteur 8th Wall (binaire, chargé depuis jsDelivr) |
| 3D, animations, ombres | three.js |
| Physique des cubes | cannon-es |
| Serveur de développement, build | Vite |
| Tests | vitest |

Crédit : AR engine 8th Wall XR Engine, Niantic Spatial (licence d'usage limité, moteur non modifié).

## Fichiers

```
public/models/character.glb   le personnage (animations : Idle, Walking, Jump, Boxing, Push)
src/main.js        point d'entrée : lit le lien, choisit le mode AR ou bureau
src/ar.js          mode AR : démarre 8th Wall, le tap sur le sol (hitTest), les ombres
src/desktop.js     mode bureau (?desktop) pour tester sur PC, clavier WASD + J K L
src/app.js         le jeu : état, boutons, forces sur les cubes, groupe "world" à l'échelle
src/character.js   chargement du modèle, animations, déplacement, mouvement de racine
src/root-motion.js calcul du mouvement porté par l'animation Push
src/movement.js    joystick vers direction du monde, rotation, vitesse (logique pure)
src/actions.js     actions (durée, moment d'impact, portée) et état d'une action
src/actions-ui.js  les trois boutons
src/cubes.js       cubes, masses, monde physique cannon-es
src/physics.js     fonctions de physique (masse, collisions du joueur avec les cubes)
src/shadow.js      sol invisible qui reçoit les ombres, lumière qui les projette
src/scale.js       taille de la scène (valeur par défaut et paramètre ?scale=)
src/joystick.js    joystick tactile
tests/             tests des fonctions pures (48 tests)
docs/superpowers/  anciens documents de conception (en partie périmés, voir plus bas)
```

## Modifier le jeu

**Changer de personnage :** remplacer `public/models/character.glb` par un autre GLB, avec le même nom. Il doit avoir des animations nommées `Idle` et `Walking` (le code cherche « idle » et « walk » dans les noms), et `Jump`, `Boxing`, `Push` pour les boutons. Si le personnage marche à reculons, régler `MODEL_FACING_OFFSET` dans `src/character.js` (0 si le modèle regarde vers +Z, `Math.PI` s'il regarde vers -Z).

**Changer la taille de la scène :** ajouter `?scale=` au lien. `?scale=1.1` est plus petit, `?scale=1.5` plus grand (de 0,5 à 10). La valeur par défaut (1,3) est dans `src/scale.js`.

**Régler la physique** (dans `src/cubes.js`) :

| Constante | Effet | Valeur actuelle |
|---|---|---|
| `BOX_IMPULSE` | force du coup de poing | 2,5 |
| `MAX_SPEED` | vitesse maximale d'un cube après un coup | 4 m/s |
| `WALK_FORCE` | force quand on marche dans un cube | 60 N |
| `PUSH_FORCE` | force de l'action Pousser | 140 N |
| `JUMP_IMPULSE` | force du saut sur les cubes proches | 1,5 |
| `CUBE_DENSITY` | densité (donc le poids des cubes) | 200 kg/m3 |

Les tailles des cubes sont dans `cubeSpecs()` du même fichier. La friction de cannon-es est calibrée pour un pas de 1/60 s : ne pas changer `FIXED_DT` sans la recalibrer.

## Tester sur PC

```
npm install
npm run dev
```

Ouvrir `http://localhost:5173/?desktop` : le personnage est posé sans AR. Touches : W A S D (ou les flèches) pour marcher, J sauter, K frapper, L pousser. Ajouter `&debug=1` expose `window.__app` dans la console pour inspecter l'état.

```
npm test        # lance les 48 tests
```

## Publier une mise à jour

Le site est hébergé par GitHub Pages depuis la branche `gh-pages` (pas de workflow automatique).

1. `npm test` puis `npm run build` (crée le dossier `dist/`).
2. Supprimer `dist/models/character.AVANT.glb` s'il est présent (copie de sauvegarde à ne pas publier).
3. Pousser le code : `git push origin main`.
4. Copier le contenu de `dist/` dans un dossier temporaire, y ajouter un fichier vide `.nojekyll`, y faire `git init -b gh-pages`, un commit, puis `git push -f` vers `https://github.com/diakitemoussa-dot/ar-game.git` sur la branche `gh-pages`.
5. Déclencher la publication : `gh api -X POST repos/diakitemoussa-dot/ar-game/pages/builds`.

Si la page ne change pas sur le téléphone, fermer l'onglet et rouvrir le lien (cache du navigateur).

## Limites connues

- Le **placement au sol en AR** et les **ombres sur l'image de la caméra** n'ont été vérifiés qu'en mode bureau. Le test sur téléphone reste à faire et à ajuster.
- Les constantes de physique ont été réglées sans essai sur téléphone : la force des coups et la résistance des gros cubes sont faciles à modifier (tableau ci-dessus).
- La liste exacte des navigateurs et téléphones supportés par le suivi du sol n'est pas documentée par 8th Wall.

## Historique

Une voiture conduisible et un adversaire à boxer ont été conçus puis retirés. Les documents de `docs/superpowers/` décrivent encore ces idées et la première version du jeu : ils sont conservés comme historique, mais ne reflètent plus l'état actuel.
