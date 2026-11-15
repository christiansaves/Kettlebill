import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv, isConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Modèles : modifiables sans toucher au code (variables d'environnement).
export const MODELS = {
  smart: process.env.AI_MODEL_SMART || "claude-sonnet-5-5",
  fast: process.env.AI_MODEL_FAST || "claude-haiku-4-5",
};

// Prix en $ US par million de jetons (entrée, sortie), pour suivre les coûts.
// À mettre à jour si les tarifs changent : https://www.anthropic.com/pricing
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "claude-haiku-4-5-20251001": [1, 5],
};

export type AiFeature = "fiscal" | "letter" | "translate";

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "quota" | "failed",
    message: string,
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function anthropic() {
  if (!isConfigured.ai()) throw new AiError("not_configured", "L'IA n'est pas encore configurée (ANTHROPIC_API_KEY).");
  client ??= new Anthropic({ apiKey: serverEnv.anthropicKey() });
  return client;
}

/** Nombre d'utilisations d'une fonction IA par l'utilisateur depuis le début du mois. */
export async function usageThisMonth(userId: string, feature: AiFeature) {
  const admin = createAdminClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

/** Lève une erreur « quota » si la limite mensuelle du forfait est atteinte. */
export async function assertQuota(userId: string, feature: AiFeature, limit: number) {
  if (!Number.isFinite(limit)) return;
  const used = await usageThisMonth(userId, feature);
  if (used >= limit) {
    throw new AiError("quota", "Limite mensuelle atteinte pour ton forfait.");
  }
}

async function logUsage(userId: string | null, feature: AiFeature, model: string, usage: { input_tokens: number; output_tokens: number }) {
  if (!userId) return;
  const [pi, po] = PRICES[model] ?? [0, 0];
  const cost = (usage.input_tokens * pi + usage.output_tokens * po) / 1_000_000;
  await createAdminClient().from("ai_usage").insert({
    user_id: userId,
    feature,
    model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost_usd: cost,
  });
}

/**
 * Demande une réponse JSON validée par un schéma (sorties structurées).
 * Les données de l'utilisateur sont passées comme données, jamais comme instructions.
 */
export async function askJson<T>(opts: {
  userId: string | null;
  feature: AiFeature;
  model?: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const model = opts.model ?? MODELS.smart;
  try {
    const res = await anthropic().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { format: { type: "json_schema", schema: opts.schema } },
    });
    await logUsage(opts.userId, opts.feature, model, res.usage);
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return JSON.parse(text) as T;
  } catch (e) {
    if (e instanceof AiError) throw e;
    console.error("[ai]", e);
    throw new AiError("failed", "L'IA n'a pas pu répondre. Réessaie dans un instant.");
  }
}

/** Réponse texte libre (ex. : rédaction d'une lettre). */
export async function askText(opts: {
  userId: string | null;
  feature: AiFeature;
  model?: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const model = opts.model ?? MODELS.smart;
  try {
    const res = await anthropic().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    await logUsage(opts.userId, opts.feature, model, res.usage);
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (e) {
    if (e instanceof AiError) throw e;
    console.error("[ai]", e);
    throw new AiError("failed", "L'IA n'a pas pu répondre. Réessaie dans un instant.");
  }
}
