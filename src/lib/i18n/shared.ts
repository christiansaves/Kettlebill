// Fonctions utilisables côté serveur ET côté client.

export type Messages = Record<string, string>;
export type T = (key: string, vars?: Record<string, string | number>) => string;

/** Crée une fonction de traduction : t("cle", { nom: "Ana" }) remplace {nom}. */
export function makeT(messages: Messages, fallback?: Messages): T {
  return (key, vars) => {
    let s = messages[key] ?? fallback?.[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
