import "server-only";
import { cookies } from "next/headers";

export const THEME_COOKIE = "kb_theme";

/** Thème choisi (témoin mis à jour depuis les réglages) : system | light | dark. */
export async function getTheme(): Promise<"system" | "light" | "dark"> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}
