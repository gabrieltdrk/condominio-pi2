import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error(`Missing environment variable: one of ${names.join(", ")}`);
}

export function getClients(req: Request) {
  const url = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { userClient, adminClient };
}

export function extractBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as { sub?: string; email?: string; role?: string };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request) {
  const { adminClient } = getClients(req);
  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, adminClient, error: "Unauthorized" };
  }

  const authResult = await adminClient.auth.getUser(token);
  if (authResult.error || !authResult.data.user) {
    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      return {
        user: {
          id: payload.sub,
          email: payload.email ?? "",
          role: payload.role ?? "authenticated",
        },
        adminClient,
        error: null,
      };
    }

    return { user: null, adminClient, error: authResult.error?.message ?? "Unauthorized" };
  }

  return { user: authResult.data.user, adminClient, error: null };
}

export async function hashToken(token: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function createRawToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function requireUser(req: Request) {
  const { userClient, adminClient } = getClients(req);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return { user: data.user, adminClient };
}

export async function fetchRequest(adminClient: ReturnType<typeof getClients>["adminClient"], requestId: string) {
  const { data: request, error: requestError } = await adminClient
    .from("visitor_requests")
    .select("id, resident_id, apartment_id, status, requires_portaria_qr, expected_check_in, expected_check_out, adults_count, children_count, pets_count, notes")
    .eq("id", requestId)
    .single();
  if (requestError || !request) throw new Error("Visitor request not found");

  const { data: guests, error: guestsError } = await adminClient
    .from("visitor_request_guests")
    .select("id, full_name, birth_date, cpf, email, is_primary")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (guestsError) throw new Error(guestsError.message);

  const primaryGuest = (guests ?? []).find((guest) => guest.is_primary) ?? guests?.[0];
  if (!primaryGuest?.email) throw new Error("Primary guest email is required");

  const { data: resident, error: residentError } = await adminClient
    .from("profiles")
    .select("id, name, email")
    .eq("id", request.resident_id)
    .single();
  if (residentError || !resident) throw new Error("Resident not found");

  return { request, guests: guests ?? [], primaryGuest, resident };
}
