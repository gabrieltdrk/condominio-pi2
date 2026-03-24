import { corsHeaders, getClients, hashToken, json } from "../_shared/visitors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) return json({ error: "token is required" }, 400);

    const { userClient, adminClient } = getClients(req);
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", auth.user.id)
      .single();
    if (profileError || !profile) return json({ error: "Profile not found" }, 404);

    const tokenHash = await hashToken(token);
    const { data: accessToken, error: tokenError } = await adminClient
      .from("visitor_tokens")
      .select("id, request_id, used_at, expires_at")
      .eq("token_hash", tokenHash)
      .eq("token_type", "ACCESS")
      .single();
    if (tokenError || !accessToken) return json({ error: "QR code invalido." }, 404);
    if (accessToken.used_at) return json({ error: "Este QR code ja foi utilizado." }, 409);
    if (new Date(accessToken.expires_at).getTime() < Date.now()) return json({ error: "Este QR code expirou." }, 410);

    const { data: request, error: requestError } = await adminClient
      .from("visitor_requests")
      .select("id, status, requires_portaria_qr")
      .eq("id", accessToken.request_id)
      .single();
    if (requestError || !request) return json({ error: "Visita nao encontrada." }, 404);

    const now = new Date().toISOString();
    const isGatekeeper = profile.role === "PORTEIRO" || profile.role === "ADMIN";
    const isResident = profile.role === "MORADOR" || profile.role === "ADMIN";

    if (request.requires_portaria_qr) {
      if (!isGatekeeper) return json({ error: "Somente a portaria pode validar este QR code." }, 403);
      await adminClient.from("visitor_requests").update({ status: "CHECKED_IN", checked_in_at: now }).eq("id", request.id);
      await adminClient.from("visitor_tokens").update({ used_at: now }).eq("id", accessToken.id);
      return json({ status: "CHECKED_IN", actor: "gatekeeper" });
    }

    if (!isResident) return json({ error: "Somente o morador pode validar este QR code." }, 403);
    await adminClient.from("visitor_requests").update({ status: "VALIDADO_MORADOR", resident_validated_at: now }).eq("id", request.id);
    await adminClient.from("visitor_tokens").update({ used_at: now }).eq("id", accessToken.id);
    return json({ status: "VALIDADO_MORADOR", actor: "resident" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
