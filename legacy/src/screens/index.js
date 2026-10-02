import { HomeScreen } from "./HomeScreen.js";
import { IntroScreen } from "./IntroScreen.js";
import { PuzzleScreen } from "./PuzzleScreen.js";
import { EndScreen } from "./EndScreen.js";

/** Table des routes : ajouter un écran = créer son fichier + une ligne ici. */
export const routes = {
    home: HomeScreen,
    intro: IntroScreen,
    puzzle: PuzzleScreen,
    end: EndScreen,
};
