import { requireContext } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { buttonClass, ButtonLink, Card, Field, Input, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { Icon } from "@/components/icons";
import { deleteAccount } from "./actions";

export default async function DataPage() {
  const ctx = await requireContext();
  const [t, tc] = await Promise.all([getT("settings"), getT("common")]);
  const word = t("delete.word");
  const sharedOwned = ctx.spaces.filter((s) => s.owner_id === ctx.user.id && s.kind !== "personal").length;
  const memberOf = ctx.spaces.filter((s) => s.owner_id !== ctx.user.id).length;
  const hasSub = Boolean(ctx.billing?.stripe_subscription_id) && ctx.billing?.status !== "canceled";

  return (
    <>
      <PageHeader
        title={t("data.title")}
        description={t("data.subtitle")}
        actions={
          <ButtonLink href="/app/reglages" variant="secondary">
            {tc("action.back")}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-5">
        <Card>
          <SectionTitle>{t("export.title")}</SectionTitle>
          <p>{t("export.text")}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
            <li>{t("export.itemProfile")}</li>
            <li>{t("export.itemSpaces")}</li>
            <li>{t("export.itemFiles")}</li>
          </ul>
          <a href="/app/reglages/donnees/export" download className={buttonClass("primary", "md", "mt-4")}>
            <Icon name="download" size={18} aria-hidden="true" />
            {t("export.button")}
          </a>
        </Card>

        <Card className="border-bad">
          <SectionTitle>{t("delete.title")}</SectionTitle>
          <p className="font-semibold">{t("delete.intro")}</p>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm">
            <li>{t("delete.consequenceAccount")}</li>
            <li>{t("delete.consequencePersonal")}</li>
            <li>{t("delete.consequenceShared", { n: sharedOwned })}</li>
            {memberOf > 0 ? <li>{t("delete.consequenceMember", { n: memberOf })}</li> : null}
            <li>{hasSub ? t("delete.consequenceSubscription") : t("delete.consequenceNoSubscription")}</li>
            <li>{t("delete.consequenceFinal")}</li>
          </ul>
          <div className="mt-4">
            <Notice tone="warn">{t("delete.exportFirst")}</Notice>
          </div>
          <div className="mt-4">
            <ActionForm action={deleteAccount} submitLabel={t("delete.button")} pendingLabel={t("delete.pending")} submitVariant="danger">
              <Field label={t("delete.confirmLabel", { word })}>
                <Input name="confirm" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={word} className="sm:max-w-xs" />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
