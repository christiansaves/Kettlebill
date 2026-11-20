// Registre des espaces de noms de traduction. Chaque module a son propre fichier.
import common from "./common";
import auth from "./auth";
import landing from "./landing";
import dashboard from "./dashboard";
import deadlines from "./deadlines";
import budget from "./budget";
import recurring from "./recurring";
import documents from "./documents";
import letters from "./letters";
import fiscal from "./fiscal";
import reports from "./reports";
import settings from "./settings";
import billing from "./billing";
import legal from "./legal";
import scan from "./scan";

export const NAMESPACES = {
  common,
  auth,
  landing,
  dashboard,
  deadlines,
  budget,
  recurring,
  documents,
  letters,
  fiscal,
  reports,
  settings,
  billing,
  legal,
  scan,
};

export type Namespace = keyof typeof NAMESPACES;
