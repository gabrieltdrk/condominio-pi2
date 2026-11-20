import { Resend } from "npm:resend";
import { corsHeaders, getEnv, getFirstEnv, json } from "../_shared/visitors.ts";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MORADOR: "Morador",
  PORTEIRO: "Porteiro",
};

function emailHtml(inviteUrl: string, role: string, condominioName?: string) {
  const roleLabel = ROLE_LABEL[role] ?? role;
  const condo = condominioName ? `<strong>${condominioName}</strong>` : "nosso condomínio";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite para o sistema do condomínio</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:24px;line-height:48px;">🏢</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:16px;font-weight:700;color:#1e293b;">Sistema do Condomínio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.07);">

              <!-- Accent bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#7c3aed,#4f46e5,#06b6d4);"></td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 32px;">

                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6366f1;">Novo acesso</p>
                  <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2;">Você foi convidado!</h1>

                  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;">
                    Você recebeu um convite para acessar o sistema de ${condo} com o perfil de <strong>${roleLabel}</strong>.
                    Clique no botão abaixo para definir sua senha e completar seu cadastro.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:14px;">
                              <a href="${inviteUrl}"
                                 style="display:inline-block;padding:16px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                                Aceitar convite →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Info box -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                    <tr>
                      <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
                        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                          🔒 &nbsp;Por segurança, este link é válido por <strong>24 horas</strong>.<br />
                          🔑 &nbsp;Você criará sua própria senha ao aceitar o convite.<br />
                          📱 &nbsp;Após o acesso, configure seu perfil completo.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link -->
                  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Se o botão não funcionar, copie e cole este link no navegador:<br />
                    <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all;">${inviteUrl}</a>
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                    Se você não esperava este convite, pode ignorar este e-mail com segurança.
                  </p>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Bottom spacer -->
          <tr><td style="height:32px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, inviteUrl, role, condominioName } = await req.json() as {
      to: string;
      inviteUrl: string;
      role: string;
      condominioName?: string;
    };

    if (!to || !inviteUrl) return json({ error: "to e inviteUrl são obrigatórios" }, 400);

    const resend = new Resend(getEnv("RESEND_API_KEY"));
    const from = getFirstEnv(["INVITE_FROM_EMAIL", "VISITOR_FROM_EMAIL"]);

    const result = await resend.emails.send({
      from,
      to: [to],
      subject: "Você foi convidado para o sistema do condomínio",
      html: emailHtml(inviteUrl, role ?? "MORADOR", condominioName),
    });

    if (result.error) return json({ error: result.error.message }, 502);

    return json({ ok: true, emailId: result.data?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return json({ error: msg }, 500);
  }
});
