import { Resend } from "npm:resend";
import { corsHeaders, createRawToken, fetchRequest, getClients, getFirstEnv, getEnv, hashToken, json } from "../_shared/visitors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { requestId } = await req.json();
    if (!requestId) return json({ error: "requestId is required" }, 400);

    const { userClient, adminClient } = getClients(req);

    const { data: visibleRequest, error: visibleRequestError } = await userClient
      .from("visitor_requests")
      .select("id")
      .eq("id", requestId)
      .maybeSingle();

    if (visibleRequestError) {
      return json({ error: visibleRequestError.message }, 401);
    }

    if (!visibleRequest) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { request, primaryGuest, resident } = await fetchRequest(adminClient, requestId);

    const rawToken = createRawToken();
    const tokenHash = await hashToken(rawToken);

    await adminClient.from("visitor_tokens").delete().eq("request_id", requestId).eq("token_type", "CONFIRMATION").is("used_at", null);
    const { error: tokenError } = await adminClient.from("visitor_tokens").insert({
      request_id: requestId,
      guest_id: primaryGuest.id,
      token_type: "CONFIRMATION",
      token_hash: tokenHash,
      expires_at: request.expected_check_out,
    });
    if (tokenError) throw new Error(tokenError.message);

    const resend = new Resend(getEnv("RESEND_API_KEY"));
    const from = getFirstEnv(["VISITOR_EMAIL_FROM", "VISITOR_FROM_EMAIL"]);
    const baseUrl = getFirstEnv(["VISITOR_APP_URL", "APP_BASE_URL"]).replace(/\/$/, "");
    const confirmUrl = `${baseUrl}/visitantes/aprovacao?token=${encodeURIComponent(rawToken)}`;

    const emailResult = await resend.emails.send({
      from,
      to: primaryGuest.email,
      subject: "Confirme sua visita no condominio",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <p style="font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#4f46e5">Convite de visita</p>
          <h1 style="font-size:28px;line-height:1.1;margin:12px 0 16px">Ola, ${primaryGuest.full_name}.</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px">O morador ${resident.name ?? resident.email ?? "responsavel"} cadastrou sua visita. Confirme para liberar o envio do QR code de acesso.</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px"><strong>Check-in previsto:</strong> ${new Date(request.expected_check_in).toLocaleString("pt-BR")}<br /><strong>Check-out previsto:</strong> ${new Date(request.expected_check_out).toLocaleString("pt-BR")}</p>
          <a href="${confirmUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 20px;border-radius:16px;font-weight:700">Confirmar visita</a>
          <p style="font-size:13px;line-height:1.6;color:#64748b;margin-top:24px">Se o botao nao abrir, use este link: ${confirmUrl}</p>
        </div>
      `,
    });
    if (emailResult.error) throw new Error(emailResult.error.message);

    await adminClient.from("visitor_requests").update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", requestId);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
