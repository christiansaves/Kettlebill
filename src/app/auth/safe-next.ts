// Redirections après connexion : seulement des chemins relatifs du site (jamais « //hôte » ni une URL absolue).
export function safeNext(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Les navigateurs traitent « /\hôte » comme « //hôte » ; refuser aussi les caractères de contrôle.
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
