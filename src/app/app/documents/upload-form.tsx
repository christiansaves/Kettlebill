"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makeT, type Messages } from "@/lib/i18n/shared";
import { Button, Field, Input, Select, Progress, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { prepareUpload, registerDocument } from "./actions";
import { ACCEPT_ATTR, DOC_CATEGORIES, MAX_FILE_BYTES, baseName, mimeForName } from "./doc-utils";

type Phase = "idle" | "preparing" | "uploading" | "saving";
const STEP: Record<Phase, number> = { idle: 0, preparing: 1, uploading: 2, saving: 3 };

export function UploadForm({ messages, defaultCategory }: { messages: Messages; defaultCategory?: string }) {
  const t = makeT(messages);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [expires, setExpires] = useState("");
  const [remind, setRemind] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = phase !== "idle";

  function checkFile(f: File): string | null {
    if (f.size === 0) return t("error.empty");
    if (f.size > MAX_FILE_BYTES) return t("error.tooBig");
    if (!mimeForName(f.name)) return t("error.type");
    return null;
  }

  function onPick(f: File | null) {
    setError(null);
    setSuccess(null);
    setFile(f);
    if (!f) return;
    const problem = checkFile(f);
    if (problem) setError(problem);
    if (!titleTouched) setTitle(baseName(f.name).slice(0, 200));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);
    if (!file) return setError(t("error.noFile"));
    const problem = checkFile(file);
    if (problem) return setError(problem);
    if (!title.trim()) return setError(t("error.title"));
    if (remind && !expires) return setError(t("error.remindNeedsDate"));
    const category = String(new FormData(e.currentTarget).get("category") ?? "other");

    try {
      setPhase("preparing");
      const prep = await prepareUpload({ name: file.name, size: file.size });
      if (!prep.ok) {
        setError(prep.error);
        return;
      }

      setPhase("uploading");
      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from("documents")
        .upload(prep.path, file, { contentType: prep.contentType, upsert: false, cacheControl: "3600" });
      if (upError) {
        console.error("[documents] upload", upError);
        setError(t("error.upload"));
        return;
      }

      setPhase("saving");
      const res = await registerDocument({ path: prep.path, title, category, expiresOn: expires, remind });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(res.message ?? t("upload.done"));
      formRef.current?.reset();
      setFile(null);
      setTitle("");
      setTitleTouched(false);
      setExpires("");
      setRemind(false);
      router.refresh();
    } catch (err) {
      console.error("[documents] upload flow", err);
      setError(t("error.upload"));
    } finally {
      setPhase("idle");
    }
  }

  const phaseLabel = phase === "preparing" ? t("upload.preparing") : phase === "uploading" ? t("upload.uploading") : t("upload.saving");

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" aria-busy={busy}>
      <Field label={t("upload.file")} hint={t("upload.fileHint")}>
        <input
          type="file"
          name="file"
          accept={ACCEPT_ATTR}
          required
          disabled={busy}
          onChange={(e) => onPick(e.currentTarget.files?.[0] ?? null)}
          className="block w-full min-w-0 rounded-xl border border-dashed border-line bg-surface-2 p-3 text-sm text-muted file:me-3 file:h-10 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:font-semibold file:text-accent-ink"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("upload.titleField")}>
          <Input
            name="title"
            value={title}
            maxLength={200}
            required
            disabled={busy}
            placeholder={t("upload.titlePlaceholder")}
            onChange={(e) => {
              setTitle(e.currentTarget.value);
              setTitleTouched(true);
            }}
          />
        </Field>
        <Field label={t("upload.category")}>
          <Select name="category" defaultValue={defaultCategory ?? "other"} disabled={busy}>
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`cat.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("upload.expires")}>
          <Input type="date" name="expires_on" value={expires} disabled={busy} onChange={(e) => setExpires(e.currentTarget.value)} />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 self-end rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <input
            type="checkbox"
            name="remind"
            checked={remind}
            disabled={busy}
            onChange={(e) => setRemind(e.currentTarget.checked)}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t("upload.remind")}</span>
            <span className="block text-xs text-muted">{t("upload.remindHint")}</span>
          </span>
        </label>
      </div>

      {busy ? (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">{phaseLabel}</span>
            <span className="tabular text-muted">{t("upload.step", { n: STEP[phase] })}</span>
          </div>
          <Progress value={STEP[phase]} max={3} label={phaseLabel} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !file}>
          <Icon name="upload" size={18} />
          {busy ? phaseLabel : t("upload.submit")}
        </Button>
        {error ? (
          <p className="text-sm font-semibold text-bad" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className={cx("text-sm font-semibold", success === t("upload.done") ? "text-good" : "text-warn")} role="status">
            {success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
