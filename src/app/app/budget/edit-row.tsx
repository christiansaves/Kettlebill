"use client";
// Ligne de tableau (ordinateur) avec un formulaire de modification dépliable sous la ligne.
import { useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui";

export function EditableRow({
  cells,
  actions,
  form,
  editLabel,
  closeLabel,
  colSpan,
}: {
  cells: ReactNode;
  actions: ReactNode;
  form: ReactNode;
  editLabel: string;
  closeLabel: string;
  colSpan: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-line align-middle">
        {cells}
        <td className="py-2 ps-3">
          <div className="flex items-center justify-end gap-1">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={buttonClass("ghost", "sm")}>
              {open ? closeLabel : editLabel}
            </button>
            {actions}
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="bg-surface-2">
          <td colSpan={colSpan} className="p-4">
            {form}
          </td>
        </tr>
      ) : null}
    </>
  );
}
