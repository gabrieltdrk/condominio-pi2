import { corsHeaders } from "../_shared/cors.ts";
import {
  createServiceClient,
  createUserClient,
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
    const userClient = createUserClient(authHeader);
    const admin = createServiceClient();

    const authResult = await userClient.auth.getUser();
    if (authResult.error || !authResult.data.user) {
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
      .eq("id", authResult.data.user.id)
      .maybeSingle();

    const role = (profileResult.data?.role ?? "MORADOR") as "ADMIN" | "MORADOR" | "PORTEIRO";
    const canDispatch = role === "ADMIN" || bundle.request.resident_id === authResult.data.user.id;
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
