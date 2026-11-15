"use client";
// Champs d'une transaction : la liste des catégories change selon le type (revenu / dépense).
import { useEffect, useRef, useState } from "react";
import { Field, Input, Select, cx } from "@/components/ui";

type Kind = "income" | "expense";
type Option = { value: string; label: string };

export interface TransactionFieldsLabels {
  kind: string;
  income: string;
  expense: string;
  amount: string;
  amountHint: string;
  category: string;
  label: string;
  labelPlaceholder: string;
  date: string;
  deductible: string;
  deductibleHint: string;
}

export function TransactionFields({
  labels,
  categories,
  defaults,
}: {
  labels: TransactionFieldsLabels;
  categories: { income: Option[]; expense: Option[] };
  defaults: { kind: Kind; amount: string; category: string; label: string; date: string; deductible: boolean };
}) {
  const [kind, setKind] = useState<Kind>(defaults.kind);
  const ref = useRef<HTMLDivElement>(null);

  // Quand le formulaire est vidé après un ajout, revenir au type par défaut.
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onReset = () => setKind(defaults.kind);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaults.kind]);

  const options = categories[kind];
  const defaultCategory = kind === defaults.kind && options.some((o) => o.value === defaults.category) ? defaults.category : options[0]?.value;

  return (
    <div ref={ref} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">{labels.kind}</legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          {(["expense", "income"] as const).map((k) => (
            <label
              key={k}
              className={cx(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                kind === k ? "border-accent bg-soft text-accent" : "border-line bg-surface text-ink",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                defaultChecked={defaults.kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {k === "income" ? labels.income : labels.expense}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.amount} hint={labels.amountHint}>
          <Input name="amount" inputMode="decimal" required autoComplete="off" defaultValue={defaults.amount} className="tabular" />
        </Field>
        <Field label={labels.category}>
          {/* key : recrée la liste quand le type change, pour repartir de la bonne valeur par défaut */}
          <Select key={kind} name="category" defaultValue={defaultCategory} required>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.label}>
          <Input name="label" maxLength={200} placeholder={labels.labelPlaceholder} defaultValue={defaults.label} />
        </Field>
        <Field label={labels.date}>
          <Input type="date" name="occurred_on" required defaultValue={defaults.date} />
        </Field>
      </div>

      {kind === "expense" ? (
        <label className="flex min-h-10 cursor-pointer items-start gap-3">
          <input type="checkbox" name="tax_deductible" defaultChecked={defaults.deductible} className="mt-1 size-5 shrink-0 accent-accent" />
          <span>
            <span className="block text-sm font-semibold">{labels.deductible}</span>
            <span className="block text-xs text-muted">{labels.deductibleHint}</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
