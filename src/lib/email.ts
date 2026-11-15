import "server-only";
import { Resend } from "resend";
import { serverEnv, isConfigured } from "@/lib/env";

let resend: Resend | null = null;

/** Envoie un courriel transactionnel. Retourne false si l'envoi n'est pas configuré ou a échoué. */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!isConfigured.email()) {
    console.warn("[email] RESEND_API_KEY absent : courriel non envoyé →", opts.subject);
    return false;
  }
  resend ??= new Resend(serverEnv.resendKey());
  const { error } = await resend.emails.send({
    from: serverEnv.emailFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) {
    console.error("[email]", error);
    return false;
  }
  return true;
}

/** Échappe le texte pour l'insérer dans du HTML de courriel. */
export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Gabarit HTML sobre aux couleurs de Kettlebill. */
export function emailLayout(title: string, bodyHtml: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#F3F6F7;font-family:Arial,Helvetica,sans-serif;color:#10222B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #D8E1E4">
<tr><td style="padding:20px 24px;border-bottom:1px solid #D8E1E4;font-weight:700;font-size:18px;color:#0E6B6B">kettlebill</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #D8E1E4;font-size:12px;color:#56676F">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
