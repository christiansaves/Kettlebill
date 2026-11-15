import { requireContext } from "@/lib/session";

const TABLES = ["transactions", "budgets", "deadlines", "recurring", "documents", "letters", "fiscal_estimates"] as const;
const PAGE = 1000;

/** Exporte les données de l'utilisateur en JSON (portabilité, Loi 25). */
export async function GET() {
  const ctx = await requireContext();

  async function all(table: string, spaceId: string) {
    const rows: unknown[] = [];
    for (let from = 0; from < 200_000; from += PAGE) {
      const { data, error } = await ctx.supabase
        .from(table)
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  }

  try {
    const owned = ctx.spaces.filter((s) => s.owner_id === ctx.user.id);
    const spaces = await Promise.all(
      ctx.spaces.map(async (s) => {
        const base = { id: s.id, name: s.name, kind: s.kind, role: s.role, created_at: s.created_at };
        if (!owned.some((o) => o.id === s.id)) return base;
        const data = Object.fromEntries(await Promise.all(TABLES.map(async (tb) => [tb, await all(tb, s.id)] as const)));
        const { data: members } = await ctx.supabase.from("space_members").select("user_id, role, created_at").eq("space_id", s.id);
        const { data: invites } = await ctx.supabase.from("space_invites").select("email, accepted_at, created_at").eq("space_id", s.id);
        return { ...base, members: members ?? [], invites: invites ?? [], data };
      }),
    );

    const billing = ctx.billing
      ? {
          plan: ctx.billing.plan,
          status: ctx.billing.status,
          billing_interval: ctx.billing.billing_interval,
          current_period_end: ctx.billing.current_period_end,
          trial_end: ctx.billing.trial_end,
          cancel_at_period_end: ctx.billing.cancel_at_period_end,
          updated_at: ctx.billing.updated_at,
        }
      : null;

    const body = {
      format: "kettlebill-export",
      version: 1,
      exported_at: new Date().toISOString(),
      account: { id: ctx.user.id, email: ctx.user.email },
      profile: ctx.profile,
      billing,
      spaces,
    };
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kettlebill-export-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[export]", e);
    return new Response(JSON.stringify({ error: "export_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
