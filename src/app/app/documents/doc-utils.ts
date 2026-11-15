// Constantes et utilitaires du module Documents (utilisables côté serveur ET client).

export const DOC_CATEGORIES = [
  "identity",
  "insurance",
  "tax",
  "housing",
  "health",
  "vehicle",
  "warranty",
  "contract",
  "bank",
  "other",
] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export function isDocCategory(c: string): c is DocCategory {
  return (DOC_CATEGORIES as readonly string[]).includes(c);
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo (identique à la limite du bucket)

/** Extensions acceptées → type MIME enregistré (on n'utilise jamais le type fourni par le navigateur). */
export const ALLOWED_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES)
  .map((e) => `.${e}`)
  .join(",");

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function mimeForName(name: string): string | null {
  return ALLOWED_TYPES[extensionOf(name)] ?? null;
}

/** Nom du fichier sans son extension (titre par défaut). */
export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return (i > 0 ? name.slice(0, i) : name).trim();
}

/** Nom de fichier sûr : lettres ASCII, chiffres, tiret et point ; 80 caractères au plus ; extension conservée. */
export function sanitizeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = baseName(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9.-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);
  const room = 80 - (safeExt ? safeExt.length + 1 : 0);
  const b = (base || "fichier").slice(0, room).replace(/[-.]+$/g, "") || "fichier";
  return safeExt ? `${b}.${safeExt}` : b;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

/** Vérifie la forme complète d'un chemin de stockage : <space_id>/<uuid>-<nom-sûr>. */
export function isValidStoragePath(path: string, spaceId: string): boolean {
  if (!path.startsWith(`${spaceId}/`)) return false;
  const file = path.slice(spaceId.length + 1);
  if (file.includes("/")) return false;
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([A-Za-z0-9.-]{1,80})$/i.exec(file);
  return Boolean(m && sanitizeFileName(m[2]) === m[2]);
}

export function formatBytes(n: number, locale: string): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: u === 0 ? 0 : 1 }).format(v);
  return `${num} ${units[u]}`;
}

/** Nom proposé au téléchargement : titre + extension d'origine, sans caractères dangereux. */
export function downloadName(title: string, storagePath: string): string {
  const ext = extensionOf(storagePath);
  const clean = title
    .replace(/[\u0000-\u001f\u007f"\\/:*?<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const base = clean || "document";
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
}
