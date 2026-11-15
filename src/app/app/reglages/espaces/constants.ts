// Une invitation non acceptée expire après ce délai.
export const INVITE_TTL_DAYS = 30;

export function isInviteExpired(createdAt: string, now = Date.now()) {
  return now - Date.parse(createdAt) > INVITE_TTL_DAYS * 86_400_000;
}
