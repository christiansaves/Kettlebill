import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { LegalDoc } from "../legal-doc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("legal");
  return { title: t("privacy.metaTitle"), description: t("privacy.metaDescription") };
}

export default function PrivacyPage() {
  return <LegalDoc doc="privacy" />;
}
