"use client";
// Écran du scanner : photo → lecture par l'IA → formulaire prérempli à vérifier → enregistrement.
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { makeT, type Messages } from "@/lib/i18n/shared";
import { Icon } from "@/components/icons";
import { Badge, Button, Card, Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { analyzeScan, saveScan } from "./actions";
import type { ScanResult } from "./types";

const MAX_SIDE = 1600;

/** Réduit la photo (max 1600 px, JPEG) : envoi plus rapide et lecture moins coûteuse. */
async function compress(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], "scan.jpg", { type: "image/jpeg" });
  } catch {
    return file; // format que le navigateur ne sait pas décoder : on envoie tel quel
  }
}

type Phase = "idle" | "preparing" | "reading" | "review" | "saving" | "done";

export function Scanner({
  m,
  categoryLabels,
  expenseCategories,
  incomeCategories,
  currency,
  locale,
}: {
  m: Messages;
  categoryLabels: Record<string, string>;
  expenseCategories: string[];
  incomeCategories: string[];
  currency: string;
  locale: string;
}) {
  const t = makeT(m);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [result, setResult] = useState<{ done: string[]; warnings: string[]; transaction: boolean; deadline: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPhase("idle");
    setError(null);
    setImage(null);
    setPreview(null);
    setScan(null);
    setResult(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhase("preparing");
    const small = await compress(file);
    setImage(small);
    setPreview(URL.createObjectURL(small));
    setPhase("reading");
    const fd = new FormData();
    fd.set("image", small);
    startTransition(async () => {
      const res = await analyzeScan(fd);
      if (!res.ok) {
        setError(res.error);
        setPhase("idle");
        return;
      }
      setScan(res.data);
      setDirection(res.data.direction);
      setPhase("review");
    });
  }

  function onSave(fd: FormData) {
    setPhase("saving");
    setError(null);
    if (fd.get("save_document") === "on" && image) fd.set("image", image);
    startTransition(async () => {
      const res = await saveScan(fd);
      if (!res.ok) {
        setError(res.error);
        setPhase("review");
        return;
      }
      setResult(res);
      setPhase("done");
    });
  }

  const busy = phase === "preparing" || phase === "reading" || phase === "saving";
  const decimal = (n: number) => (locale.startsWith("en") ? n.toFixed(2) : n.toFixed(2).replace(".", ","));
  const unpaidBill = scan?.kind === "bill" && !scan.alreadyPaid;

  return (
    <div className="flex flex-col gap-4">
      {/* Champs de fichier cachés : appareil photo (arrière) et galerie */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {error ? <Notice tone="bad">{error}</Notice> : null}

      {phase === "idle" ? (
        <Card className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-soft text-accent">
            <Icon name="camera" size={40} />
          </span>
          <p className="max-w-sm text-muted">{t("hint")}</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <Button size="lg" onClick={() => cameraRef.current?.click()}>
              <Icon name="camera" size={20} />
              {t("take")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => galleryRef.current?.click()}>
              <Icon name="upload" size={20} />
              {t("choose")}
            </Button>
          </div>
        </Card>
      ) : null}

      {busy ? (
        <Card className="flex flex-col items-center gap-4 py-8 text-center" aria-live="polite">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-64 rounded-xl border border-line object-contain" />
          ) : null}
          <div className="flex items-center gap-3 font-semibold">
            <span className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
            {phase === "preparing" ? t("step.preparing") : phase === "reading" ? t("step.reading") : t("step.saving")}
          </div>
        </Card>
      ) : null}

      {phase === "review" && scan ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{t("review.title")}</h2>
              <p className="text-sm text-muted">{t("review.subtitle")}</p>
            </div>
            <Badge tone={scan.confidence === "low" ? "warn" : "accent"}>{t("review.detected", { kind: t(`kind.${scan.kind}`) })}</Badge>
          </div>
          {scan.confidence === "low" ? (
            <div className="mb-4">
              <Notice tone="warn">{t("review.confidence.low")}</Notice>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="max-h-72 w-full rounded-xl border border-line object-contain md:max-h-[28rem]" />
            ) : null}

            <form action={onSave} className="flex min-w-0 flex-col gap-4">
              <fieldset className="flex gap-2">
                <legend className="mb-1.5 text-sm font-semibold">{t("field.type")}</legend>
                {(["expense", "income"] as const).map((d) => (
                  <label
                    key={d}
                    className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border font-semibold ${
                      direction === d ? "border-accent bg-soft text-accent" : "border-line bg-surface"
                    }`}
                  >
                    <input type="radio" name="direction" value={d} checked={direction === d} onChange={() => setDirection(d)} className="sr-only" />
                    {t(`field.${d}`)}
                  </label>
                ))}
              </fieldset>

              <Field label={t("field.label")}>
                <Input name="label" defaultValue={scan.label} required maxLength={120} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("field.amount")} hint={scan.currency !== currency ? t("field.currencyNote", { currency: scan.currency }) : undefined}>
                  <Input name="amount" inputMode="decimal" defaultValue={decimal(scan.total)} required className="tabular" />
                </Field>
                <Field label={t("field.date")}>
                  <Input name="date" type="date" defaultValue={scan.date} required />
                </Field>
              </div>

              <Field label={t("field.category")}>
                <Select name="category" key={direction} defaultValue={direction === scan.direction ? scan.category : direction === "income" ? "otherIncome" : "other"}>
                  {(direction === "income" ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c} value={c}>
                      {categoryLabels[c] ?? c}
                    </option>
                  ))}
                </Select>
              </Field>

              {scan.taxes.length ? (
                <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <p className="font-semibold">{t("field.taxes")}</p>
                  <ul className="tabular text-muted">
                    {scan.taxes.map((x, i) => (
                      <li key={i}>
                        {x.name} : {x.amount != null ? decimal(x.amount) : "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {scan.items.length ? (
                <details className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-semibold">
                    {t("field.items")} ({scan.items.length})
                  </summary>
                  <ul className="mt-2 flex flex-col gap-0.5 text-muted">
                    {scan.items.map((x, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{x.description}</span>
                        <span className="tabular shrink-0">{x.amount != null ? decimal(x.amount) : ""}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="flex flex-col gap-2.5 text-[15px]">
                {direction === "expense" ? (
                  <label className="flex items-start gap-3">
                    <input type="checkbox" name="deductible" defaultChecked={scan.deductible} className="mt-1 size-5 accent-[var(--accent)]" />
                    <span>{t("field.deductible")}</span>
                  </label>
                ) : null}
                {scan.dueDate ? (
                  <>
                    <input type="hidden" name="due_date" value={scan.dueDate} />
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="create_deadline" defaultChecked={unpaidBill} className="mt-1 size-5 accent-[var(--accent)]" />
                      <span>{t("field.createDeadline", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${scan.dueDate}T12:00:00`)) })}</span>
                    </label>
                  </>
                ) : null}
                {unpaidBill ? (
                  <label className="flex items-start gap-3">
                    <input type="checkbox" name="record_transaction" className="mt-1 size-5 accent-[var(--accent)]" />
                    <span>{t("field.alreadyPaid")}</span>
                  </label>
                ) : (
                  <input type="hidden" name="record_transaction" value="on" />
                )}
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="save_document" defaultChecked className="mt-1 size-5 accent-[var(--accent)]" />
                  <span>{t("field.saveDocument")}</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={buttonClass("primary", "lg")}>
                  <Icon name="check" size={20} />
                  {t("save")}
                </button>
                <Button type="button" variant="ghost" size="lg" onClick={reset}>
                  {t("retake")}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      ) : null}

      {phase === "done" && result ? (
        <Card className="flex flex-col gap-3" aria-live="polite">
          <h2 className="flex items-center gap-2 text-lg font-bold text-good">
            <Icon name="check" size={22} />
            {t("saved.title")}
          </h2>
          <ul className="flex flex-col gap-1">
            {result.done.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          {result.warnings.map((w, i) => (
            <Notice key={i} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={reset}>
              <Icon name="camera" size={20} />
              {t("again")}
            </Button>
            {result.transaction ? (
              <Link href="/app/budget" className={buttonClass("secondary", "lg")}>
                {t("saved.viewBudget")}
              </Link>
            ) : null}
            {result.deadline ? (
              <Link href="/app/echeances" className={buttonClass("secondary", "lg")}>
                {t("saved.viewDeadlines")}
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
