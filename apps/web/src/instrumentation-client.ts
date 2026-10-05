// Chargé par Next avant que l'application ne devienne interactive : capte les erreurs
// qui échappent aux error boundaries de React (gestionnaires d'évènements, promesses).
import { reportClientError } from "./lib/reportError";

window.addEventListener("error", (event) => reportClientError("error", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportClientError("unhandledrejection", event.reason));
