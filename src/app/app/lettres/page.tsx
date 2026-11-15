import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { isUnlimited } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { usageThisMonth } from "@/lib/ai";
import type { T } from "@/lib/i18n/shared";
import type { Letter } from "@/lib/types";
import { Card, EmptyState, Field, Input, Notice, PageHeader, Progress, SectionTitle, Select, Textarea, cx } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { Icon } from "@/components/icons";
import { createLetter, draftWithAi } from "./actions";
import { lettersThisMonth } from "./queries";
import { TEMPLATES, TEMPLATE_FIELDS, isTemplate, type FieldDef, type TemplateId } from "./letter-utils";
import { StatusBadge, templateLabel } from "./status-badge";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function TemplateField({ f, t, defaultValue }: { f: FieldDef; t: T; defaultValue?: string }) {
  const label = t(f.labelKey ?? `field.${f.key}`);
  const hint = f.hintKey ? t(f.hintKey) : undefined;
  const common = { name: f.key, required: f.required, maxLength: f.max, defaultValue };
  const wide = f.type === "long";
  return (
    <Field label={label} hint={hint} className={cx(wide && "sm:col-span-2")}>
      {f.type === "long" ? (
        <Textarea {...common} rows={5} />
      ) : f.type === "multiline" ? (
        <Textarea {...common} rows={3} className="min-h-20" />
      ) : f.type === "date" ? (
        <Input {...common} type="date" />
      ) : f.type === "amount" ? (
        <Input {...common} inputMode="decimal" autoComplete="off" />
      ) : (
        <Input {...common} type="text" autoComplete={f.key === "myName" ? "name" : "off"} />
      )}
    </Field>
  );
}

export default async function LettersPage({ searchParams }: PageProps<"/app/lettres">) {
  const ctx = await requireContext();
  const t = await getT("letters");
  const tc = await getT("common");
  const sp = await searchParams;
  const tplParam = first(sp.template);
  const template: TemplateId | null = isTemplate(tplParam) ? tplParam : null;
  const recipient = first(sp.recipient).trim().slice(0, 120);

  const [used, { data }] = await Promise.all([
    lettersThisMonth(ctx),
    ctx.supabase
      .from("letters")
      .select("id, template, recipient, subject, status, created_at, updated_at")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const letters = (data ?? []) as Pick<Letter, "id" | "template" | "recipient" | "subject" | "status" | "created_at" | "updated_at">[];

  const limit = ctx.limits.lettersPerMonth;
  const unlimited = isUnlimited(limit);
  const full = !unlimited && used >= limit;

  const aiLimit = ctx.limits.aiLettersPerMonth;
  let aiUsed = 0;
  if (aiLimit > 0 && !isUnlimited(aiLimit)) {
    try {
      aiUsed = await usageThisMonth(ctx.user.id, "letter");
    } catch {
      aiUsed = 0;
    }
  }
  const aiFull = aiLimit > 0 && !isUnlimited(aiLimit) && aiUsed >= aiLimit;

  const recipientQs = recipient ? `&recipient=${encodeURIComponent(recipient)}` : "";
  const myName = ctx.profile.full_name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Notice tone="neutral">
        <span className="flex items-start gap-2">
          <Icon name="mail" size={18} className="mt-0.5 shrink-0" />
          <span>{t("notSent")}</span>
        </span>
      </Notice>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{t("usage.label")}</p>
          <p className="tabular text-sm text-muted">
            {unlimited ? t("usage.unlimited", { used }) : t("usage.count", { used, limit })}
          </p>
        </div>
        {!unlimited ? <Progress value={used} max={limit} label={t("usage.label")} /> : null}
        {ctx.plan === "free" ? (
          <Link href="/app/reglages/forfait" className="text-sm font-semibold text-accent hover:underline">
            {t("usage.upgrade")}
          </Link>
        ) : null}
      </Card>

      <section id="nouvelle">
        <SectionTitle
          action={
            template ? (
              <Link href="/app/lettres#nouvelle" className="text-sm font-semibold text-accent hover:underline">
                {t("new.change")}
              </Link>
            ) : undefined
          }
        >
          {template ? t(`tpl.${template}.name`) : t("new.title")}
        </SectionTitle>

        {full ? (
          <Notice tone="warn">
            <p>{t("usage.full", { limit })}</p>
            <Link href="/app/reglages/forfait" className="mt-1 inline-block font-semibold underline">
              {tc("plan.upgrade")}
            </Link>
          </Notice>
        ) : template ? (
          <Card>
            <ActionForm
              key={`${template}:${recipient}`}
              action={createLetter}
              submitLabel={t("new.submit")}
              pendingLabel={t("new.pending")}
            >
              <input type="hidden" name="template" value={template} />
              <p className="text-sm text-muted">{t("new.prefillNote")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATE_FIELDS[template].map((f) => (
                  <TemplateField
                    key={f.key}
                    f={f}
                    t={t}
                    defaultValue={f.key === "recipient" ? recipient : f.key === "myName" ? myName : undefined}
                  />
                ))}
              </div>
            </ActionForm>
          </Card>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">{t("new.choose")}</p>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TEMPLATES.map((id) => (
                <li key={id}>
                  <Link
                    href={`/app/lettres?template=${id}${recipientQs}#nouvelle`}
                    className="flex h-full min-h-20 flex-col gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent hover:bg-surface-2"
                  >
                    <span className="font-bold">{t(`tpl.${id}.name`)}</span>
                    <span className="text-sm text-muted">{t(`tpl.${id}.desc`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Icon name="sparkle" size={18} className="text-accent" />
            {t("ai.title")}
          </span>
        </SectionTitle>
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t("ai.desc")}</p>
          {aiLimit <= 0 ? (
            <Notice tone="accent">
              <p>{t("ai.upsell")}</p>
              <Link href="/app/reglages/forfait" className="mt-1 inline-block font-semibold underline">
                {t("ai.upsellLink")}
              </Link>
            </Notice>
          ) : full ? null : aiFull ? (
            <Notice tone="warn">{t("ai.quotaReached")}</Notice>
          ) : (
            <ActionForm action={draftWithAi} submitLabel={t("ai.submit")} pendingLabel={t("ai.pending")}>
              <Field label={t("ai.situation")} hint={t("ai.situationHint")}>
                <Textarea name="situation" required minLength={10} maxLength={4000} rows={6} placeholder={t("ai.situationPlaceholder")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("ai.recipient")}>
                  <Input name="recipient" maxLength={120} defaultValue={recipient} autoComplete="off" />
                </Field>
                <Field label={t("field.myName")}>
                  <Input name="myName" maxLength={120} defaultValue={myName} autoComplete="name" />
                </Field>
                <Field label={t("ai.tone")}>
                  <Select name="tone" defaultValue="polite">
                    <option value="polite">{t("ai.tone.polite")}</option>
                    <option value="firm">{t("ai.tone.firm")}</option>
                  </Select>
                </Field>
              </div>
              {!isUnlimited(aiLimit) ? <p className="tabular text-xs text-muted">{t("ai.usage", { used: aiUsed, limit: aiLimit })}</p> : null}
              <p className="text-xs text-muted">{t("ai.disclaimer")}</p>
            </ActionForm>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>{t("list.title")}</SectionTitle>
        {letters.length === 0 ? (
          <EmptyState title={t("list.empty")} text={t("list.emptyText")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {letters.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/app/lettres/${l.id}`}
                  className="flex min-h-16 flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 transition hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-bold">{l.subject || t("ai.defaultSubject")}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {[templateLabel(l.template, t), l.recipient ? t("list.to", { recipient: l.recipient }) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={l.status} t={t} />
                    <span className="tabular text-xs text-muted">{t("list.updated", { date: formatDate(l.updated_at, ctx.locale) })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

