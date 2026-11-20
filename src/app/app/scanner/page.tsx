import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getMessages, getT } from "@/lib/i18n/server";
import { usageThisMonth } from "@/lib/ai";
import { isUnlimited } from "@/lib/plans";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { Card, PageHeader } from "@/components/ui";
import { Scanner } from "./scanner";

export const metadata = { title: "Scanner" };
// La lecture d'une photo par l'IA peut prendre jusqu'à ~30 s.
export const maxDuration = 60;

export default async function ScannerPage() {
  const ctx = await requireContext();
  const [t, tc, m] = await Promise.all([getT("scan"), getT("common"), getMessages("scan")]);

  let used = 0;
  try {
    used = await usageThisMonth(ctx.user.id, "scan");
  } catch {
    /* clé serveur absente : on n'affiche pas l'usage */
  }
  const limit = ctx.limits.scansPerMonth;
  const categoryLabels = Object.fromEntries([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c, tc(`cat.${c}`)]));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <p className="mb-4 text-sm text-muted tabular">
        {isUnlimited(limit) ? t("usage.unlimited", { used }) : t("usage", { used, limit })}
        {ctx.plan === "free" ? (
          <>
            {" · "}
            <Link href="/app/reglages/forfait" className="font-semibold text-accent underline">
              {t("upgrade")}
            </Link>
          </>
        ) : null}
      </p>

      <Scanner
        m={m}
        categoryLabels={categoryLabels}
        expenseCategories={[...EXPENSE_CATEGORIES]}
        incomeCategories={[...INCOME_CATEGORIES]}
        currency={ctx.currency}
        locale={ctx.locale}
      />

      <Card className="mt-6">
        <h2 className="mb-2 text-base font-bold">{t("tip.title")}</h2>
        <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-muted">
          <li>{t("tip.receipt")}</li>
          <li>{t("tip.bill")}</li>
          <li>{t("tip.paystub")}</li>
          <li>{t("tip.languages")}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">{t("privacy")}</p>
      </Card>
    </>
  );
}
