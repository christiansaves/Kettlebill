// Lecture centralisée des variables d'environnement.
// Les valeurs NEXT_PUBLIC_* sont visibles dans le navigateur ; les autres restent sur le serveur.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export const serverEnv = {
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  stripeSecretKey: () => required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
  anthropicKey: () => required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  resendKey: () => required("RESEND_API_KEY", process.env.RESEND_API_KEY),
  emailFrom: () => process.env.EMAIL_FROM || "Kettlebill <rappels@kettlebill.com>",
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
};

export const isConfigured = {
  supabase: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  stripe: () => Boolean(process.env.STRIPE_SECRET_KEY),
  ai: () => Boolean(process.env.ANTHROPIC_API_KEY),
  email: () => Boolean(process.env.RESEND_API_KEY),
};
