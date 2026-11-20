// Types des tables (miroir de supabase/migrations/0001_init.sql).

export type SpaceKind = "personal" | "family" | "business";

export interface Profile {
  id: string;
  full_name: string;
  locale: string;
  country: string;
  region: string;
  currency: string;
  theme: "system" | "light" | "dark";
  email_reminders: boolean;
  onboarded: boolean;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  kind: SpaceKind;
  owner_id: string;
  created_at: string;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
}

export interface Billing {
  user_id: string;
  plan: "free" | "individual" | "family";
  status: string;
  billing_interval: "month" | "year" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}

export interface Transaction {
  id: string;
  space_id: string;
  kind: "income" | "expense";
  amount_cents: number;
  currency: string;
  category: string;
  label: string;
  occurred_on: string;
  tax_deductible: boolean;
  document_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  space_id: string;
  category: string;
  monthly_limit_cents: number;
  created_at: string;
}

export type DeadlineKind = "bill" | "renewal" | "document" | "tax" | "appointment" | "other";
export type Recurrence = "none" | "monthly" | "quarterly" | "yearly";

export interface Deadline {
  id: string;
  space_id: string;
  title: string;
  kind: DeadlineKind;
  due_on: string;
  amount_cents: number | null;
  recurrence: Recurrence;
  remind_days: number;
  notes: string;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Recurring {
  id: string;
  space_id: string;
  name: string;
  amount_cents: number;
  period: "weekly" | "monthly" | "yearly";
  next_charge_on: string | null;
  category: string;
  active: boolean;
  notes: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  space_id: string;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  expires_on: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Letter {
  id: string;
  space_id: string;
  template: string;
  recipient: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "answered";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalEstimate {
  id: string;
  space_id: string;
  country: string;
  region: string;
  tax_year: number;
  input: unknown;
  result: unknown;
  created_by: string | null;
  created_at: string;
}

/** Résultat d'une action serveur appelée depuis un formulaire. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
