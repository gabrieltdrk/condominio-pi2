import { corsHeaders } from "../_shared/cors.ts";
import {
  createServiceClient,
  fetchVisitorBundle,
  findToken,
  notifyResident,
  replaceToken,
  sendAccessEmail,
} from "../_shared/visitor-flow.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const rawToken = String(body?.token ?? "").trim();
    if (!rawToken) {
      return new Response(JSON.stringify({ error: "Token obrigatorio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createServiceClient();
    const token = await findToken(admin, rawToken, "APPROVAL");
    const bundle = await fetchVisitorBundle(admin, token.request_id);

    if (bundle.request.status === "CANCELADO") {
      return new Response(JSON.stringify({ error: "Esta visita foi cancelada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (bundle.request.principal_confirmed_at) {
      return new Response(JSON.stringify({ error: "Esta visita ja foi confirmada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const requestUpdate = await admin
      .from("visitor_requests")
      .update({
        status: "CONFIRMADO",
        principal_confirmed_at: now,
      })
      .eq("id", bundle.request.id);

    if (requestUpdate.error) throw new Error(requestUpdate.error.message);

    const tokenConsume = await admin
      .from("visitor_flow_tokens")
      .update({ consumed_at: now })
      .eq("id", token.id);

    if (tokenConsume.error) throw new Error(tokenConsume.error.message);

    const accessToken = await replaceToken(admin, bundle.request.id, "ACCESS", {
      guestId: bundle.primaryGuest.id,
      actor: bundle.request.requires_portaria_qr ? "gatekeeper" : "resident",
      expiresAt: bundle.request.expected_check_out,
    });

    await sendAccessEmail(bundle, accessToken);
    await notifyResident(
      admin,
      bundle,
      "Visitante confirmado",
      `${bundle.primaryGuest.full_name} confirmou a visita para ${bundle.apartment ? `${bundle.apartment.tower} ap. ${bundle.apartment.number}` : "sua unidade"}.`,
    );

    return new Response(
      JSON.stringify({
        status: "CONFIRMADO",
        requiresPortariaQr: bundle.request.requires_portaria_qr,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao aprovar visita.";
    const status =
      message === "Token de visitante invalido."
        ? 404
        : message === "Este token ja foi utilizado." || message === "Este token expirou." || message === "Esta visita foi cancelada." || message === "Esta visita ja foi confirmada."
          ? 400
          : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
