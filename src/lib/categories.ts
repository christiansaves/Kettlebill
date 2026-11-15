// Catégories (clés stables en base ; libellés dans messages/common.ts sous cat.<clé>).
export const EXPENSE_CATEGORIES = [
  "housing",
  "groceries",
  "transport",
  "utilities",
  "subscriptions",
  "health",
  "insurance",
  "education",
  "kids",
  "leisure",
  "restaurants",
  "clothing",
  "gifts",
  "savings",
  "taxes",
  "business",
  "other",
] as const;

export const INCOME_CATEGORIES = ["salary", "freelance", "benefits", "investment", "otherIncome"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export function isCategory(kind: "income" | "expense", c: string) {
  return (kind === "income" ? (INCOME_CATEGORIES as readonly string[]) : (EXPENSE_CATEGORIES as readonly string[])).includes(c);
}
