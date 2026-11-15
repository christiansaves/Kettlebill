import { Badge } from "@/components/ui";
import type { T } from "@/lib/i18n/shared";
import { isStatus, isTemplate } from "./letter-utils";

const TONES = { draft: "neutral", sent: "accent", answered: "good" } as const;

export function StatusBadge({ status, t }: { status: string; t: T }) {
  const s = isStatus(status) ? status : "draft";
  return <Badge tone={TONES[s]}>{t(`status.${s}`)}</Badge>;
}

export function templateLabel(template: string, t: T): string {
  if (template === "ai") return t("tplName.ai");
  return isTemplate(template) ? t(`tpl.${template}.name`) : "";
}
