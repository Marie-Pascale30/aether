import { h } from "./core/dom.js";
import { createRouter } from "./core/router.js";
import { LEVELS } from "./data/levels.js";
import { validateLevels } from "./game/validateLevels.js";
import { Header } from "./components/Header.js";
import { routes } from "./screens/index.js";

validateLevels(LEVELS).forEach((error) => console.error(`[AETHER] ${error}`));

const app = document.getElementById("app");
const screenRoot = h("main");

app.append(Header(), screenRoot);

createRouter(screenRoot, routes).navigate("home");
