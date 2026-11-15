import { Icon } from "@/components/icons";
import type { T } from "@/lib/i18n/shared";

/** Avertissement bien visible : estimation informative, pas un avis fiscal. */
export function Disclaimer({ t }: { t: T }) {
  return (
    <section className="rounded-2xl border border-transparent bg-warn-bg p-4 text-warn sm:p-5" aria-labelledby="fiscal-disclaimer">
      <div className="flex gap-3">
        <Icon name="alert" size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="fiscal-disclaimer" className="font-bold">
            {t("disclaimer.title")}
          </h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
            <li>{t("disclaimer.informational")}</li>
            <li>{t("disclaimer.rules")}</li>
            <li>{t("disclaimer.ai")}</li>
            <li>{t("disclaimer.professional")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
