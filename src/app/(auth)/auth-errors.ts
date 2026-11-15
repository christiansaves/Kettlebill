// Traduit une erreur Supabase Auth en clé de message du module « auth ».
export function authErrorKey(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!error) return "error.generic";
  switch (error.code) {
    case "invalid_credentials":
      return "error.invalidCredentials";
    case "email_not_confirmed":
      return "error.emailNotConfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "error.rateLimit";
    case "weak_password":
      return "error.weakPassword";
    case "user_already_exists":
    case "email_exists":
      return "error.alreadyRegistered";
    case "same_password":
      return "error.samePassword";
    case "email_address_invalid":
    case "validation_failed":
      return "error.invalidEmail";
    case "signup_disabled":
      return "error.signupDisabled";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "error.link";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "error.session";
  }
  if (error.status === 429) return "error.rateLimit";
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "error.invalidCredentials";
  if (msg.includes("email not confirmed")) return "error.emailNotConfirmed";
  if (msg.includes("already registered")) return "error.alreadyRegistered";
  if (msg.includes("rate limit")) return "error.rateLimit";
  return "error.generic";
}

/** Codes acceptés dans « ?error= » de /connexion (tout le reste devient un message générique). */
const QUERY_ERRORS: Record<string, string> = {
  link: "error.link",
  otp_expired: "error.link",
  session: "error.session",
  config: "error.config",
};

export function queryErrorKey(code: string | string[] | undefined): string | null {
  if (!code) return null;
  const c = Array.isArray(code) ? code[0] : code;
  return QUERY_ERRORS[c] ?? "error.generic";
}
