import { Resend } from "npm:resend";
import QRCode from "npm:qrcode";
import { corsHeaders, createRawToken, fetchRequest, getClients, getFirstEnv, getEnv, hashToken, json } from "../_shared/visitors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { token } = await req.json();
    if (!token) return json({ error: "token is required" }, 400);

    const { adminClient } = getClients(req);
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();

    const { data: confirmationToken, error: tokenError } = await adminClient
      .from("visitor_tokens")
      .select("id, request_id, guest_id, used_at, expires_at")
      .eq("token_hash", tokenHash)
      .eq("token_type", "CONFIRMATION")
      .single();
    if (tokenError || !confirmationToken) return json({ error: "Link de confirmacao invalido." }, 404);
    if (confirmationToken.used_at) return json({ error: "Este link ja foi utilizado." }, 409);
    if (new Date(confirmationToken.expires_at).getTime() < Date.now()) return json({ error: "Este link expirou." }, 410);

    const { request, primaryGuest, resident } = await fetchRequest(adminClient, confirmationToken.request_id);
    if (request.status === "CANCELADO") return json({ error: "Esta visita foi cancelada." }, 409);

    const rawAccessToken = createRawToken();
    const accessHash = await hashToken(rawAccessToken);
    const accessPayload = `omni-visit:${rawAccessToken}`;
    const accessQr = await QRCode.toDataURL(accessPayload, { margin: 1, width: 280 });
    const appBaseUrl = getFirstEnv(["APP_BASE_URL", "VISITOR_APP_URL"]).replace(/\/$/, "");
    const accessCardUrl = `${appBaseUrl}/visitantes/cartao?token=${encodeURIComponent(rawAccessToken)}`;

    const resend = new Resend(getEnv("RESEND_API_KEY"));
    const emailResult = await resend.emails.send({
      from: getFirstEnv(["VISITOR_EMAIL_FROM", "VISITOR_FROM_EMAIL"]),
      to: primaryGuest.email,
      subject: "Seu QR code de acesso foi liberado",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <p style="font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#4f46e5">QR code de acesso</p>
          <h1 style="font-size:28px;line-height:1.1;margin:12px 0 16px">Visita confirmada.</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px">${request.requires_portaria_qr ? "Apresente este QR code na portaria para autenticar seu check-in." : "Envie este QR code ao morador para que ele faca a validacao da sua visita."}</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px"><strong>Check-in previsto:</strong> ${new Date(request.expected_check_in).toLocaleString("pt-BR")}<br /><strong>Check-out previsto:</strong> ${new Date(request.expected_check_out).toLocaleString("pt-BR")}</p>
          <p style="margin:0 0 24px"><a href="${accessCardUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 20px;border-radius:16px;font-weight:700">Abrir QR code em uma pagina separada</a></p>
          <div style="margin:24px 0;padding:20px;border:1px solid #e2e8f0;border-radius:24px;background:#f8fafc;text-align:center">
            <img src="${accessQr}" alt="QR code de acesso" style="max-width:280px;width:100%;height:auto" />
          </div>
          <p style="font-size:13px;line-height:1.6;color:#64748b">Codigo de leitura manual: ${accessPayload}</p>
          <p style="font-size:13px;line-height:1.6;color:#64748b">Se o QR nao aparecer no seu app de e-mail, abra o cartao online pelo botao acima.</p>
        </div>
      `,
    });
    if (emailResult.error) throw new Error(emailResult.error.message);

    await adminClient.from("visitor_tokens").update({ used_at: now }).eq("id", confirmationToken.id);
    await adminClient.from("visitor_tokens").delete().eq("request_id", request.id).eq("token_type", "ACCESS").is("used_at", null);
    await adminClient.from("visitor_tokens").insert({
      request_id: request.id,
      guest_id: primaryGuest.id,
      token_type: "ACCESS",
      token_hash: accessHash,
      expires_at: request.expected_check_out,
    });
    await adminClient.from("visitor_requests").update({
      status: "CONFIRMADO",
      principal_confirmed_at: now,
    }).eq("id", request.id);
    await adminClient.from("system_notifications").insert({
      user_id: resident.id,
      title: "Visitante confirmou a visita",
      message: `${primaryGuest.full_name} confirmou a visita agendada para ${new Date(request.expected_check_in).toLocaleString("pt-BR")}.`,
      category: "VISITANTES",
      link: "/visitantes",
      metadata: { requestId: request.id, guestId: primaryGuest.id },
    });

    return json({ status: "CONFIRMADO", requiresPortariaQr: request.requires_portaria_qr });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
