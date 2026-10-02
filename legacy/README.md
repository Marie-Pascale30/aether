# AETHER — Prototype 0.1

Jeu de puzzles contemplatif en JavaScript natif (modules ES, sans build ni dépendance).

## Lancer

Les modules ES ne se chargent pas en `file://` : il faut un petit serveur local.

```bash
npx serve .
# ou : python -m http.server
```

Ou l'extension VS Code **Live Server** sur `index.html`.

## Structure

```
index.html              Coquille HTML (charge styles/main.css et src/main.js)
styles/
  tokens.css            Variables (couleurs, polices, rayons)
  base.css              Reset, typographie, utilitaires
  components/           Un fichier CSS par composant
  screens/              Un fichier CSS par écran
src/
  main.js               Point d'entrée : monte le header et le routeur
  config.js             Constantes de jeu
  core/                 dom (h), router, store — génériques, sans logique métier
  data/levels.js        Définition des énigmes
  i18n/                 Textes de l'interface (fr.js) + langue active (index.js)
  game/
    Puzzle.js           Règles d'une énigme (pur, sans DOM)
    state.js            État global + actions + sélecteurs
    garden.js           Stade du jardin selon la progression
    validateLevels.js   Contrôle des données de niveaux (erreurs en console)
  components/           Briques d'UI réutilisables (Button, Board, Garden…)
  screens/              Écrans + table des routes (screens/index.js)
```

## Étendre

- **Nouvelle énigme** : ajouter un objet dans `src/data/levels.js` (le compteur « ÉNIGME x / N » s'adapte).
- **Nouvel écran** : créer `src/screens/MonEcran.js` qui renvoie `{ el, destroy? }`, puis l'ajouter dans `src/screens/index.js`.
- **Nouvelle langue** : dupliquer `src/i18n/fr.js` et changer la sélection dans `src/i18n/index.js`.
