// Champs du formulaire d'échéance (ajout et modification). Composant serveur.
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { T } from "@/lib/i18n/shared";
import type { Deadline } from "@/lib/types";
import { KINDS, RECURRENCES, REMIND_DAYS, remindLabel } from "./lib";

export function DeadlineFields({ t, d, defaultKind, today }: { t: T; d?: Deadline; defaultKind?: string; today: string }) {
  const p = d?.id ? `${d.id}-` : "new-";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {d ? <input type="hidden" name="id" value={d.id} /> : null}
      <Field label={t("form.title")} className="sm:col-span-2">
        <Input id={`${p}title`} name="title" required maxLength={200} defaultValue={d?.title} placeholder={t("form.titlePlaceholder")} />
      </Field>
      <Field label={t("form.kind")}>
        <Select name="kind" defaultValue={d?.kind ?? defaultKind ?? "bill"}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kind.${k}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("form.dueOn")}>
        <Input type="date" name="due_on" required defaultValue={d?.due_on ?? today} />
      </Field>
      <Field label={t("form.amount")} hint={t("form.amountHint")}>
        <Input
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          className="tabular"
          defaultValue={d?.amount_cents != null ? (d.amount_cents / 100).toFixed(2) : ""}
          placeholder="0,00"
        />
      </Field>
      <Field label={t("form.recurrence")}>
        <Select name="recurrence" defaultValue={d?.recurrence ?? "none"}>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {t(`recurrence.${r}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("form.remindDays")}>
        <Select name="remind_days" defaultValue={String(d?.remind_days ?? 7)}>
          {/* Une échéance existante peut avoir une valeur hors liste (ex. 5) : on la garde visible. */}
          {d && !(REMIND_DAYS as readonly number[]).includes(d.remind_days) ? (
            <option value={d.remind_days}>{remindLabel(d.remind_days, t)}</option>
          ) : null}
          {REMIND_DAYS.map((n) => (
            <option key={n} value={n}>
              {remindLabel(n, t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("form.notes")} className="sm:col-span-2">
        <Textarea name="notes" maxLength={2000} defaultValue={d?.notes} placeholder={t("form.notesPlaceholder")} className="min-h-20" />
      </Field>
    </div>
  );
}
