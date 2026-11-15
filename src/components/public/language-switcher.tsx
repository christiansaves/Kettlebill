"use client";
// Sélecteur de langue : petit formulaire relié à l'action serveur setLocale.
import { useId } from "react";
import { LOCALES } from "@/lib/i18n/locales";
import { buttonClass, cx } from "@/components/ui";
import { setLocale } from "./actions";

export function LanguageSwitcher({
  current,
  label,
  applyLabel,
  note,
  compact = false,
  className = "",
}: {
  current: string;
  label: string;
  applyLabel: string;
  note?: string;
  /** Version compacte (en-tête) : envoi automatique au changement. */
  compact?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <form action={setLocale} className={cx("min-w-0", className)}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className={compact ? "sr-only" : "text-sm font-semibold"}>
          {label}
        </label>
        <select
          id={id}
          name="locale"
          defaultValue={current}
          onChange={compact ? (e) => e.currentTarget.form?.requestSubmit() : undefined}
          className={cx(
            "h-10 min-w-0 rounded-xl border border-line bg-surface px-2 text-sm font-semibold text-ink outline-none focus:border-accent",
            compact ? "max-w-[9.5rem]" : "max-w-[12rem]",
          )}
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <button type="submit" className={compact ? "sr-only" : buttonClass("secondary", "sm", "h-10")}>
          {applyLabel}
        </button>
      </div>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </form>
  );
}
