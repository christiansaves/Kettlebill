// Types partagés entre le serveur et l'écran du scanner.

export const SCAN_KINDS = ["receipt", "bill", "invoice", "paystub", "other"] as const;

export interface ScanResult {
  kind: (typeof SCAN_KINDS)[number];
  direction: "expense" | "income";
  label: string;
  date: string; // AAAA-MM-JJ
  total: number; // en unités (ex. 84.2)
  currency: string;
  category: string;
  dueDate: string | null;
  alreadyPaid: boolean;
  deductible: boolean;
  confidence: "low" | "medium" | "high";
  taxes: { name: string; amount: number | null }[];
  items: { description: string; amount: number | null }[];
}

export type SaveOutcome =
  | { ok: true; done: string[]; warnings: string[]; transaction: boolean; deadline: boolean }
  | { ok: false; error: string };
