import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import type { Letter } from "@/lib/types";
import { Card, Field, Input, Notice, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Icon } from "@/components/icons";
import { deleteLetter, updateLetter } from "../actions";
import { CopyButton } from "../copy-button";
import { STATUSES, isUuid } from "../letter-utils";
import { StatusBadge, templateLabel } from "../status-badge";

export default async function LetterPage({ params }: PageProps<"/app/lettres/[id]">) {
  const ctx = await requireContext();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getT("letters");
  const tc = await getT("common");

  const { data: letter } = await ctx.supabase
    .from("letters")
    .select("*")
    .eq("id", id)
    .eq("space_id", ctx.space.id)
    .maybeSingle<Letter>();
  if (!letter) notFound();

  const hasPlaceholders = /\[[^\]\n]{1,80}\]/.test(letter.body);
  const meta = [templateLabel(letter.template, t), t("edit.created", { date: formatDate(letter.created_at, ctx.locale) })]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/lettres" className="inline-flex min-h-10 w-fit items-center gap-1 text-sm font-semibold text-accent hover:underline">
        <span aria-hidden="true" className="rtl:rotate-180">←</span>
        {t("edit.back")}
      </Link>

      <PageHeader title={letter.subject || t("ai.defaultSubject")} description={meta} actions={<StatusBadge status={letter.status} t={t} />} />

      <Notice tone="neutral">
        <span className="flex items-start gap-2">
          <Icon name="mail" size={18} className="mt-0.5 shrink-0" />
          <span>{t("notSent")}</span>
        </span>
      </Notice>

      {hasPlaceholders ? <Notice tone="warn">{t("edit.placeholdersLeft")}</Notice> : null}

      <Card>
        <ActionForm action={updateLetter} submitLabel={tc("action.save")} pendingLabel={tc("state.saving")}>
          <input type="hidden" name="id" value={letter.id} />
          <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
            <Field label={t("edit.subject")}>
              <Input id="letter-subject" name="subject" defaultValue={letter.subject} maxLength={200} required />
            </Field>
            <Field label={t("status.label")}>
              <Select name="status" defaultValue={letter.status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("edit.body")}>
            <Textarea
              id="letter-body"
              name="body"
              defaultValue={letter.body}
              maxLength={20000}
              required
              rows={22}
              spellCheck
              className="min-h-96 leading-relaxed"
            />
          </Field>
        </ActionForm>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton targetId="letter-subject" label={t("copy.subject")} copiedLabel={t("copy.copied")} fallbackLabel={t("copy.fallback")} />
        <CopyButton targetId="letter-body" label={t("copy.body")} copiedLabel={t("copy.copied")} fallbackLabel={t("copy.fallback")} />
        <a href={`/app/lettres/${letter.id}/txt`} className={buttonClass("secondary", "sm", "min-h-10")}>
          {t("txt")}
        </a>
        <span className="flex-1" />
        <ConfirmButton
          action={deleteLetter}
          hidden={{ id: letter.id }}
          label={t("delete")}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("cancel")}
        />
      </div>
    </div>
  );
}
