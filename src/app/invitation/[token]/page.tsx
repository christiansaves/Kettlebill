import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { Logo } from "@/components/logo";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { isInviteExpired } from "@/app/app/reglages/espaces/constants";
import { acceptInvite, switchAccount } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const TOKEN = /^[0-9a-f]{48}$/;

type State =
  | { kind: "invalid" }
  | { kind: "used" }
  | { kind: "expired" }
  | { kind: "signedOut"; space: string }
  | { kind: "mismatch"; space: string; email: string }
  | { kind: "member"; space: string }
  | { kind: "ready"; space: string; inviter: string };

async function load(token: string): Promise<State> {
  if (!TOKEN.test(token) || !isConfigured.supabase() || !process.env.SUPABASE_SECRET_KEY) return { kind: "invalid" };
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("space_invites")
    .select("id, space_id, email, accepted_at, created_at, invited_by, spaces(name)")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return { kind: "invalid" };
  const sp = invite.spaces as { name: string } | { name: string }[] | null;
  const space = (Array.isArray(sp) ? sp[0]?.name : sp?.name) ?? "";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub as string | undefined;
  const email = ((claimsData?.claims?.email as string | undefined) ?? "").toLowerCase();

  if (uid) {
    const { data: mine } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("space_id", invite.space_id)
      .eq("user_id", uid)
      .maybeSingle();
    if (mine) return { kind: "member", space };
  }
  if (invite.accepted_at) return { kind: "used" };
  if (isInviteExpired(invite.created_at)) return { kind: "expired" };
  if (!uid) return { kind: "signedOut", space };
  if (String(invite.email).toLowerCase() !== email) return { kind: "mismatch", space, email };

  const { data: inviterProfile } = await admin.from("profiles").select("full_name").eq("id", invite.invited_by).maybeSingle();
  let inviter = inviterProfile?.full_name ?? "";
  if (!inviter) {
    const { data } = await admin.auth.admin.getUserById(invite.invited_by);
    inviter = data?.user?.email ?? "";
  }
  return { kind: "ready", space, inviter };
}

export default async function InvitationPage({ params, searchParams }: PageProps<"/invitation/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT("settings", locale);
  const state = await load(token);
  const next = encodeURIComponent(`/invitation/${token}`);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="self-center" aria-label="Kettlebill">
        <Logo size={36} />
      </Link>
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t("invitation.title")}</h1>

        {sp.erreur ? <Notice tone="bad">{t("invitation.error")}</Notice> : null}

        {state.kind === "invalid" ? (
          <>
            <p className="text-muted">{t("invitation.invalid")}</p>
            <ButtonLink href="/" variant="secondary">
              {t("invitation.home")}
            </ButtonLink>
          </>
        ) : null}

        {state.kind === "used" ? (
          <>
            <p className="text-muted">{t("invitation.used")}</p>
            <ButtonLink href="/app" variant="secondary">
              {t("invitation.openApp")}
            </ButtonLink>
          </>
        ) : null}

        {state.kind === "expired" ? <p className="text-muted">{t("invitation.expired")}</p> : null}

        {state.kind === "member" ? (
          <>
            <p>{t("invitation.alreadyMember", { space: state.space })}</p>
            <ButtonLink href="/app">{t("invitation.openApp")}</ButtonLink>
          </>
        ) : null}

        {state.kind === "signedOut" ? (
          <>
            <p>{t("invitation.signedOut", { space: state.space })}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={`/connexion?next=${next}`} className="flex-1">
                {t("invitation.signIn")}
              </ButtonLink>
              <ButtonLink href={`/inscription?next=${next}`} variant="secondary" className="flex-1">
                {t("invitation.signUp")}
              </ButtonLink>
            </div>
            <p className="text-sm text-muted">{t("invitation.sameEmail")}</p>
          </>
        ) : null}

        {state.kind === "mismatch" ? (
          <>
            <Notice tone="warn">{t("invitation.mismatch", { email: state.email })}</Notice>
            <form action={switchAccount}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton variant="secondary" className="w-full">
                {t("invitation.switchAccount")}
              </SubmitButton>
            </form>
          </>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <p>{state.inviter ? t("invitation.ready", { name: state.inviter, space: state.space }) : t("invitation.readyNoName", { space: state.space })}</p>
            <p className="text-sm text-muted">{t("invitation.readyHint")}</p>
            <form action={acceptInvite}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="w-full" pendingLabel={t("invitation.joining")}>
                {t("invitation.join")}
              </SubmitButton>
            </form>
          </>
        ) : null}
      </Card>
    </main>
  );
}
