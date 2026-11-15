import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnlimited } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { Badge, ButtonLink, Card, EmptyState, Field, Input, Notice, PageHeader, SectionTitle, Select } from "@/components/ui";
import { ActionForm, ConfirmButton, Disclosure } from "@/components/forms";
import { isInviteExpired } from "./constants";
import { createSpace, deleteSpace, inviteMember, leaveSpace, removeMember, renameSpace, revokeInvite } from "./actions";

export default async function SpacesPage() {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("settings"), getT("common")]);
  const isOwner = ctx.space.role === "owner";

  const ownedExtra = ctx.spaces.filter((s) => s.owner_id === ctx.user.id && s.kind !== "personal").length;
  const canCreate = ownedExtra < ctx.limits.spaces;

  const [{ data: memberRows }, { data: invites }] = await Promise.all([
    ctx.supabase.from("space_members").select("user_id, role, created_at").eq("space_id", ctx.space.id).order("created_at"),
    isOwner
      ? ctx.supabase
          .from("space_invites")
          .select("id, email, created_at")
          .eq("space_id", ctx.space.id)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; created_at: string }[] }),
  ]);

  // Courriels des membres de l'espace courant (on en est membre : vérifié par requireContext).
  let members: { user_id: string; role: string; email: string; name: string }[] = [];
  try {
    const admin = createAdminClient();
    const ids = (memberRows ?? []).map((m) => m.user_id as string);
    const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const nameOf = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
    members = await Promise.all(
      (memberRows ?? []).map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        return { user_id: m.user_id, role: m.role, email: data?.user?.email ?? "", name: nameOf.get(m.user_id) ?? "" };
      }),
    );
  } catch (e) {
    console.error("[spaces] members", e);
    members = (memberRows ?? []).map((m) => ({ user_id: m.user_id, role: m.role, email: "", name: "" }));
  }

  const memberLimit = ctx.limits.membersPerSpace;
  const seatsUsed = members.length + (invites?.length ?? 0);
  const spaceName = (s: { kind: string; name: string }) => (s.kind === "personal" ? tc("space.personal") : s.name);

  return (
    <>
      <PageHeader
        title={t("spaces.title")}
        description={t("spaces.subtitle")}
        actions={
          <ButtonLink href="/app/reglages" variant="secondary">
            {tc("action.back")}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-5">
        <Card>
          <SectionTitle>{t("spaces.mine")}</SectionTitle>
          <ul className="flex flex-col divide-y divide-line">
            {ctx.spaces.map((s) => {
              const mineOwned = s.owner_id === ctx.user.id && s.role === "owner";
              return (
                <li key={s.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{spaceName(s)}</span>
                      <Badge>{tc(`space.${s.kind}`)}</Badge>
                      <Badge tone={mineOwned ? "accent" : "neutral"}>{t(`role.${s.role}`)}</Badge>
                      {s.id === ctx.space.id ? <Badge tone="good">{t("spaces.current")}</Badge> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {mineOwned && s.kind !== "personal" ? (
                        <ConfirmButton
                          action={deleteSpace}
                          hidden={{ id: s.id }}
                          label={tc("action.delete")}
                          confirmLabel={t("spaces.confirmDelete")}
                          cancelLabel={tc("action.cancel")}
                        />
                      ) : null}
                      {!mineOwned ? (
                        <ConfirmButton
                          action={leaveSpace}
                          hidden={{ id: s.id }}
                          label={t("spaces.leave")}
                          confirmLabel={t("spaces.confirmLeave")}
                          cancelLabel={tc("action.cancel")}
                        />
                      ) : null}
                    </div>
                  </div>
                  {mineOwned && s.kind !== "personal" ? (
                    <>
                      <p className="text-xs text-muted">{t("spaces.deleteWarning")}</p>
                      <Disclosure label={t("spaces.rename")}>
                        <ActionForm action={renameSpace} submitLabel={tc("action.save")} pendingLabel={tc("state.saving")}>
                          <input type="hidden" name="id" value={s.id} />
                          <Field label={t("spaces.name")}>
                            <Input name="name" defaultValue={s.name} maxLength={60} required />
                          </Field>
                        </ActionForm>
                      </Disclosure>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <SectionTitle>{t("spaces.create")}</SectionTitle>
          <p className="mb-4 text-sm text-muted">
            {isUnlimited(ctx.limits.spaces)
              ? t("spaces.usageUnlimited", { used: ownedExtra })
              : t("spaces.usage", { used: ownedExtra, limit: ctx.limits.spaces })}
          </p>
          {canCreate ? (
            <ActionForm action={createSpace} submitLabel={t("spaces.createButton")} pendingLabel={tc("state.saving")} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("spaces.name")}>
                  <Input name="name" maxLength={60} required placeholder={t("spaces.namePlaceholder")} />
                </Field>
                <Field label={t("spaces.kind")}>
                  <Select name="kind" defaultValue="family">
                    <option value="family">{tc("space.family")}</option>
                    <option value="business">{tc("space.business")}</option>
                  </Select>
                </Field>
              </div>
            </ActionForm>
          ) : (
            <div className="flex flex-col gap-3">
              <Notice tone="warn">
                {ctx.limits.spaces === 0 ? t("spaces.limitFree") : t("spaces.limit", { limit: ctx.limits.spaces })}
              </Notice>
              <div>
                <ButtonLink href="/app/reglages/forfait" variant="secondary">
                  {tc("plan.upgrade")}
                </ButtonLink>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("members.title", { space: spaceName(ctx.space) })}</SectionTitle>
          {members.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {members.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {m.name || m.email || t("members.unknown")}
                      {m.user_id === ctx.user.id ? <span className="ms-1 text-muted">{t("members.you")}</span> : null}
                    </p>
                    {m.name && m.email ? <p className="truncate text-sm text-muted">{m.email}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{t(`role.${m.role}`)}</Badge>
                    {isOwner && m.user_id !== ctx.user.id && m.role !== "owner" ? (
                      <ConfirmButton
                        action={removeMember}
                        hidden={{ user_id: m.user_id }}
                        label={t("members.remove")}
                        confirmLabel={t("members.confirmRemove")}
                        cancelLabel={tc("action.cancel")}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={tc("state.empty")} />
          )}
        </Card>

        {isOwner ? (
          <Card>
            <SectionTitle>{t("invite.title")}</SectionTitle>
            {ctx.space.kind === "personal" ? (
              <Notice>{t("invite.personal")}</Notice>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  {isUnlimited(memberLimit)
                    ? t("invite.usageUnlimited", { used: seatsUsed })
                    : t("invite.usage", { used: seatsUsed, limit: memberLimit })}
                </p>
                {seatsUsed < memberLimit ? (
                  <ActionForm action={inviteMember} submitLabel={t("invite.send")} pendingLabel={t("invite.sending")} resetOnSuccess>
                    <Field label={t("invite.email")} hint={t("invite.hint")}>
                      <Input name="email" type="email" required autoComplete="off" inputMode="email" />
                    </Field>
                  </ActionForm>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Notice tone="warn">{t("invite.limit", { limit: memberLimit })}</Notice>
                    <div>
                      <ButtonLink href="/app/reglages/forfait" variant="secondary">
                        {tc("plan.upgrade")}
                      </ButtonLink>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 font-semibold">{t("invite.pending")}</h3>
                  {invites && invites.length ? (
                    <ul className="flex flex-col divide-y divide-line">
                      {invites.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-semibold">
                              <span className="truncate">{i.email}</span>
                              {isInviteExpired(i.created_at) ? <Badge tone="warn">{t("invite.expired")}</Badge> : null}
                            </p>
                            <p className="text-sm text-muted">{t("invite.sentOn", { date: formatDate(i.created_at, ctx.locale) })}</p>
                          </div>
                          <ConfirmButton
                            action={revokeInvite}
                            hidden={{ id: i.id }}
                            label={t("invite.revoke")}
                            confirmLabel={t("invite.confirmRevoke")}
                            cancelLabel={tc("action.cancel")}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">{t("invite.none")}</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </>
  );
}
