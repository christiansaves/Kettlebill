// Champs du formulaire d'abonnement (ajout et modification). Composant serveur.
import { Field, Input, Select, Textarea } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { T } from "@/lib/i18n/shared";
import type { Recurring } from "@/lib/types";
import { PERIODS } from "./lib";

export function RecurringFields({ t, tc, r }: { t: T; tc: T; r?: Recurring }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <Field label={t("form.name")} className="sm:col-span-2">
        <Input name="name" required maxLength={200} defaultValue={r?.name} placeholder={t("form.namePlaceholder")} />
      </Field>
      <Field label={t("form.amount")}>
        <Input
          name="amount"
          required
          inputMode="decimal"
          autoComplete="off"
          className="tabular"
          defaultValue={r ? (r.amount_cents / 100).toFixed(2) : ""}
          placeholder="0,00"
        />
      </Field>
      <Field label={t("form.period")}>
        <Select name="period" defaultValue={r?.period ?? "monthly"}>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {t(`period.${p}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("form.nextCharge")} hint={t("form.nextChargeHint")}>
        <Input type="date" name="next_charge_on" defaultValue={r?.next_charge_on ?? ""} />
      </Field>
      <Field label={t("form.category")}>
        <Select name="category" defaultValue={r?.category ?? "subscriptions"}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tc(`cat.${c}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("form.notes")} className="sm:col-span-2">
        <Textarea name="notes" maxLength={2000} defaultValue={r?.notes} placeholder={t("form.notesPlaceholder")} className="min-h-20" />
      </Field>
    </div>
  );
}
