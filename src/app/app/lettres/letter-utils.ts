// Modèles de lettres : champs de chaque modèle (utilisable côté serveur ET client).
// Les textes (libellés, objets, corps) vivent dans src/messages/letters.ts.

export const TEMPLATES = ["cancel", "dispute", "address", "refund", "arrangement", "custom"] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export function isTemplate(s: string): s is TemplateId {
  return (TEMPLATES as readonly string[]).includes(s);
}

export type FieldKey =
  | "recipient"
  | "recipientAddress"
  | "account"
  | "reference"
  | "amount"
  | "effectiveDate"
  | "oldAddress"
  | "proposal"
  | "reason"
  | "subject"
  | "message"
  | "myName"
  | "myAddress";

export type FieldType = "text" | "date" | "amount" | "multiline" | "long";

export interface FieldDef {
  key: FieldKey;
  type: FieldType;
  required?: boolean;
  /** Clé de libellé particulière à ce modèle (sinon field.<key>). */
  labelKey?: string;
  hintKey?: string;
  /** Champ facultatif : s'il est vide, la ligne disparaît (au lieu d'un [espace réservé]). */
  omitIfEmpty?: boolean;
  max: number;
}

const recipient: FieldDef = { key: "recipient", type: "text", required: true, max: 120 };
const recipientAddress: FieldDef = { key: "recipientAddress", type: "multiline", omitIfEmpty: true, max: 300 };
const account: FieldDef = { key: "account", type: "text", max: 80 };
const reference: FieldDef = { key: "reference", type: "text", max: 80 };
const amount: FieldDef = { key: "amount", type: "amount", max: 30 };
const effectiveDate: FieldDef = { key: "effectiveDate", type: "date", max: 10 };
const myName: FieldDef = { key: "myName", type: "text", required: true, max: 120 };
const myAddress: FieldDef = { key: "myAddress", type: "multiline", max: 300 };
const reason: FieldDef = { key: "reason", type: "long", max: 2000 };
const reasonOptional: FieldDef = { ...reason, omitIfEmpty: true, labelKey: "field.reasonOptional" };

export const TEMPLATE_FIELDS: Record<TemplateId, FieldDef[]> = {
  cancel: [recipient, recipientAddress, account, effectiveDate, reasonOptional, myName, myAddress],
  dispute: [recipient, recipientAddress, account, reference, amount, reason, myName, myAddress],
  address: [
    recipient,
    recipientAddress,
    account,
    { key: "oldAddress", type: "multiline", max: 300 },
    { ...myAddress, labelKey: "field.newAddress" },
    effectiveDate,
    myName,
  ],
  refund: [recipient, recipientAddress, account, reference, amount, reason, myName, myAddress],
  arrangement: [
    recipient,
    recipientAddress,
    account,
    { ...amount, labelKey: "field.balance" },
    { key: "proposal", type: "text", hintKey: "field.proposalHint", max: 200 },
    { ...effectiveDate, labelKey: "field.firstPayment" },
    reasonOptional,
    myName,
    myAddress,
  ],
  custom: [
    recipient,
    recipientAddress,
    { key: "subject", type: "text", required: true, max: 200 },
    { key: "message", type: "long", required: true, max: 8000 },
    myName,
    myAddress,
  ],
};

export const STATUSES = ["draft", "sent", "answered"] as const;
export type LetterStatus = (typeof STATUSES)[number];
export function isStatus(s: string): s is LetterStatus {
  return (STATUSES as readonly string[]).includes(s);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

/** Remplace {cle} en une seule passe (une valeur saisie contenant « {x} » n'est jamais réinterprétée). */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/** Nom de fichier sûr pour l'export .txt. */
export function txtFileName(subject: string): string {
  const base = subject
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  return `${base || "lettre"}.txt`;
}
