import { corsHeaders } from "../_shared/cors.ts";
import {
  authenticateRequest,
  createServiceClient,
  fetchVisitorBundle,
  replaceToken,
  sendApprovalEmail,
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
    const requestId = String(body?.requestId ?? "").trim();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId obrigatorio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bundle = await fetchVisitorBundle(admin, requestId);
    const profileResult = await admin
      .from("profiles")
      .select("role")
      .eq("id", authResult.user.id)
      .maybeSingle();

    const role = (profileResult.data?.role ?? "MORADOR") as "ADMIN" | "MORADOR" | "PORTEIRO";
    const canDispatch = role === "ADMIN" || bundle.request.resident_id === authResult.user.id;
    if (!canDispatch) {
      return new Response(JSON.stringify({ error: "Sem permissao para disparar este convite." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (bundle.request.status === "CANCELADO") {
      return new Response(JSON.stringify({ error: "Esta visita foi cancelada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approvalToken = await replaceToken(admin, requestId, "APPROVAL", {
      guestId: bundle.primaryGuest.id,
      expiresAt: bundle.request.expected_check_out,
    });

    await sendApprovalEmail(bundle, approvalToken);

    const updateResult = await admin
      .from("visitor_requests")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateResult.error) throw new Error(updateResult.error.message);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao enviar convite." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
