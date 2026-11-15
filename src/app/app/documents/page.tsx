import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getMessages, getT } from "@/lib/i18n/server";
import { isUnlimited } from "@/lib/plans";
import { daysUntil, formatDate, todayIso } from "@/lib/format";
import type { DocumentRow } from "@/lib/types";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  Notice,
  PageHeader,
  Progress,
  SectionTitle,
  Select,
  buttonClass,
} from "@/components/ui";
import { ActionForm, ConfirmButton, Disclosure } from "@/components/forms";
import { Icon } from "@/components/icons";
import { UploadForm } from "./upload-form";
import { deleteDocument, updateDocument } from "./actions";
import { DOC_CATEGORIES, formatBytes, isDocCategory } from "./doc-utils";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export default async function DocumentsPage({ searchParams }: PageProps<"/app/documents">) {
  const ctx = await requireContext();
  const t = await getT("documents");
  const tc = await getT("common");
  const messages = await getMessages("documents");
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 100);
  const catParam = first(sp.cat);
  const cat = isDocCategory(catParam) ? catParam : "";

  const { count: totalCount } = await ctx.supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("space_id", ctx.space.id);
  const used = totalCount ?? 0;

  let query = ctx.supabase
    .from("documents")
    .select("*")
    .eq("space_id", ctx.space.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);
  if (cat) query = query.eq("category", cat);
  const { data } = await query;
  const docs = (data ?? []) as DocumentRow[];

  const limit = ctx.limits.documents;
  const unlimited = isUnlimited(limit);
  const full = !unlimited && used >= limit;
  const today = todayIso();
  const filtered = Boolean(q || cat);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

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

      <section>
        <SectionTitle>{t("upload.title")}</SectionTitle>
        {full ? (
          <Notice tone="warn">
            <p>{t("usage.full", { limit })}</p>
            <Link href="/app/reglages/forfait" className="mt-1 inline-block font-semibold underline">
              {tc("plan.upgrade")}
            </Link>
          </Notice>
        ) : (
          <Card>
            <UploadForm messages={messages} defaultCategory={cat || undefined} />
          </Card>
        )}
        <p className="mt-2 text-xs text-muted">{t("privacy")}</p>
      </section>

      <section>
        <SectionTitle>{t("list.title")}</SectionTitle>
        <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end" role="search">
          <Field label={t("list.search")}>
            <Input type="search" name="q" defaultValue={q} maxLength={100} placeholder={t("list.searchPlaceholder")} />
          </Field>
          <Field label={t("upload.category")}>
            <Select name="cat" defaultValue={cat}>
              <option value="">{t("list.allCategories")}</option>
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`cat.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("secondary", "md", "flex-1 sm:flex-none")}>
              {t("list.filter")}
            </button>
            {filtered ? (
              <ButtonLink href="/app/documents" variant="ghost" className="flex-1 sm:flex-none">
                {t("list.reset")}
              </ButtonLink>
            ) : null}
          </div>
        </form>

        {docs.length === 0 ? (
          filtered ? (
            <EmptyState title={t("list.noResults")} text={t("list.noResultsText")} />
          ) : (
            <EmptyState title={t("list.empty")} text={t("list.emptyText")} />
          )
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {docs.map((d) => {
              const days = d.expires_on ? daysUntil(d.expires_on, today) : null;
              const label = isDocCategory(d.category) ? t(`cat.${d.category}`) : t("cat.other");
              return (
                <li key={d.id}>
                  <Card className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-soft text-accent">
                        <Icon name="file" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-bold">{d.title}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge tone="accent">{label}</Badge>
                          {days !== null && days < 0 ? (
                            <Badge tone="bad">{t("list.expired", { date: formatDate(d.expires_on, ctx.locale) })}</Badge>
                          ) : days !== null && days <= 60 ? (
                            <Badge tone="warn">{days === 0 ? tc("date.today") : t("list.expiresSoon", { n: days })}</Badge>
                          ) : days !== null ? (
                            <Badge>{t("list.expires", { date: formatDate(d.expires_on, ctx.locale) })}</Badge>
                          ) : null}
                        </div>
                        <p className="tabular mt-2 text-xs text-muted">
                          {formatBytes(Number(d.size_bytes), ctx.locale)} · {t("list.added", { date: formatDate(d.created_at, ctx.locale) })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <a
                        href={`/app/documents/${d.id}/telecharger?voir=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass("secondary", "sm", "min-h-10")}
                      >
                        {t("list.view")}
                      </a>
                      <a href={`/app/documents/${d.id}/telecharger`} className={buttonClass("secondary", "sm", "min-h-10")}>
                        {t("list.download")}
                      </a>
                      <ConfirmButton
                        action={deleteDocument}
                        hidden={{ id: d.id }}
                        label={t("list.delete")}
                        confirmLabel={t("list.confirmDelete")}
                        cancelLabel={t("list.cancel")}
                      />
                    </div>

                    <Disclosure label={t("list.edit")}>
                      <ActionForm action={updateDocument} submitLabel={tc("action.save")} pendingLabel={tc("state.saving")}>
                        <input type="hidden" name="id" value={d.id} />
                        <Field label={t("upload.titleField")}>
                          <Input name="title" defaultValue={d.title} maxLength={200} required />
                        </Field>
                        <Field label={t("upload.category")}>
                          <Select name="category" defaultValue={isDocCategory(d.category) ? d.category : "other"}>
                            {DOC_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {t(`cat.${c}`)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label={t("upload.expires")} hint={t("edit.clearExpiry")}>
                          <Input type="date" name="expires_on" defaultValue={d.expires_on ?? ""} />
                        </Field>
                      </ActionForm>
                    </Disclosure>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
