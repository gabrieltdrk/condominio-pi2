import { corsHeaders } from "../_shared/cors.ts";
import {
  authenticateRequest,
  createServiceClient,
  fetchVisitorBundle,
  findToken,
} from "../_shared/visitor-flow.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const admin = createServiceClient();
    const authResult = await authenticateRequest(admin, authHeader);
    if (!authResult.user) {
      return new Response(JSON.stringify({ error: "Nao autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const rawToken = String(body?.token ?? "").trim();
    if (!rawToken) {
      return new Response(JSON.stringify({ error: "Token obrigatorio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await findToken(admin, rawToken, "ACCESS");
    const bundle = await fetchVisitorBundle(admin, token.request_id);

    if (bundle.request.status === "CANCELADO") {
      return new Response(JSON.stringify({ error: "Esta visita foi cancelada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["CONFIRMADO", "VALIDADO_MORADOR"].includes(bundle.request.status)) {
      return new Response(JSON.stringify({ error: "Esta visita nao esta pronta para check-in." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileResult = await admin
      .from("profiles")
      .select("role")
      .eq("id", authResult.user.id)
      .maybeSingle();

    if (profileResult.error) throw new Error(profileResult.error.message);
    const role = (profileResult.data?.role ?? "MORADOR") as "ADMIN" | "MORADOR" | "PORTEIRO";
    const now = new Date().toISOString();

    if (!bundle.request.requires_portaria_qr) {
      const canValidateAsResident = role === "ADMIN" || authResult.user.id === bundle.request.resident_id;
      if (!canValidateAsResident) {
        return new Response(JSON.stringify({ error: "Somente o morador responsavel pode validar este QR." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateResult = await admin
        .from("visitor_requests")
        .update({
          status: "VALIDADO_MORADOR",
          resident_validated_at: now,
        })
        .eq("id", bundle.request.id);

      if (updateResult.error) throw new Error(updateResult.error.message);

      const consumeResult = await admin
        .from("visitor_flow_tokens")
        .update({ consumed_at: now })
        .eq("id", token.id);

      if (consumeResult.error) throw new Error(consumeResult.error.message);

      return new Response(JSON.stringify({ status: "VALIDADO_MORADOR", actor: "resident" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const canCheckInAtGate = role === "ADMIN" || role === "PORTEIRO";
    if (!canCheckInAtGate) {
      return new Response(JSON.stringify({ error: "Somente a portaria pode registrar este check-in." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateResult = await admin
      .from("visitor_requests")
      .update({
        status: "CHECKED_IN",
        checked_in_at: now,
      })
      .eq("id", bundle.request.id);

    if (updateResult.error) throw new Error(updateResult.error.message);

    const consumeResult = await admin
      .from("visitor_flow_tokens")
      .update({ consumed_at: now })
      .eq("id", token.id);

    if (consumeResult.error) throw new Error(consumeResult.error.message);

    return new Response(JSON.stringify({ status: "CHECKED_IN", actor: "gatekeeper" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao validar QR." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
