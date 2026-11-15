import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { LegalDoc } from "../legal-doc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("legal");
  return { title: t("terms.metaTitle"), description: t("terms.metaDescription") };
}

export default function TermsPage() {
  return <LegalDoc doc="terms" />;
}
