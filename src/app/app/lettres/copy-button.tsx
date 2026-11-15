"use client";
import { useState } from "react";
import { buttonClass } from "@/components/ui";

/**
 * Copie le contenu actuel d'un champ (input ou textarea) dans le presse-papiers.
 * Repli : sélectionne le texte et invite à faire Ctrl+C.
 */
export function CopyButton({
  targetId,
  label,
  copiedLabel,
  fallbackLabel,
}: {
  targetId: string;
  label: string;
  copiedLabel: string;
  fallbackLabel: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "fallback">("idle");

  async function copy() {
    const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(el.value);
      setState("copied");
    } catch {
      el.focus();
      el.select();
      setState("fallback");
    }
    window.setTimeout(() => setState("idle"), 4000);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className={buttonClass("secondary", "sm", "min-h-10")}>
        {state === "copied" ? copiedLabel : label}
      </button>
      {state === "fallback" ? (
        <span className="text-xs text-muted" role="status">
          {fallbackLabel}
        </span>
      ) : null}
      {state === "copied" ? (
        <span className="sr-only" role="status">
          {copiedLabel}
        </span>
      ) : null}
    </span>
  );
}
