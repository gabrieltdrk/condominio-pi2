import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@4.6.0";
import QRCode from "npm:qrcode@1.5.4";

type VisitorRequestStatus =
  | "PENDENTE_CONFIRMACAO"
  | "CONFIRMADO"
  | "VALIDADO_MORADOR"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELADO";

type RequestRow = {
  id: string;
  resident_id: string;
  apartment_id: string | null;
  status: VisitorRequestStatus;
  requires_portaria_qr: boolean;
  adults_count: number;
  children_count: number;
  pets_count: number;
  expected_check_in: string;
  expected_check_out: string;
  notes: string | null;
  principal_confirmed_at?: string | null;
};

type GuestRow = {
  id: string;
  request_id: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  email: string | null;
  is_primary: boolean;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "MORADOR" | "PORTEIRO" | null;
};

type ApartmentRow = {
  id: string;
  tower: string;
  level: number;
  number: string;
};

type TokenPurpose = "APPROVAL" | "ACCESS";

export type VisitorBundle = {
  request: RequestRow;
  guests: GuestRow[];
  primaryGuest: GuestRow;
  resident: ProfileRow;
  apartment: ApartmentRow | null;
};

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function createServiceClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createUserClient(authHeader: string | null) {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function fetchVisitorBundle(admin: ReturnType<typeof createServiceClient>, requestId: string): Promise<VisitorBundle> {
  const requestResult = await admin
    .from("visitor_requests")
    .select("id, resident_id, apartment_id, status, requires_portaria_qr, adults_count, children_count, pets_count, expected_check_in, expected_check_out, notes, principal_confirmed_at")
    .eq("id", requestId)
    .maybeSingle();

  if (requestResult.error) throw new Error(requestResult.error.message);
  if (!requestResult.data) throw new Error("Solicitacao de visita nao encontrada.");

  const request = requestResult.data as RequestRow;

  const [guestsResult, residentResult, apartmentResult] = await Promise.all([
    admin
      .from("visitor_request_guests")
      .select("id, request_id, full_name, birth_date, cpf, email, is_primary")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    admin
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", request.resident_id)
      .maybeSingle(),
    request.apartment_id
      ? admin
          .from("condo_apartments")
          .select("id, tower, level, number")
          .eq("id", request.apartment_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (guestsResult.error) throw new Error(guestsResult.error.message);
  if (residentResult.error) throw new Error(residentResult.error.message);
  if (apartmentResult.error) throw new Error(apartmentResult.error.message);
  if (!residentResult.data) throw new Error("Morador responsavel nao encontrado.");

  const guests = (guestsResult.data ?? []) as GuestRow[];
  const primaryGuest = guests.find((guest) => guest.is_primary) ?? guests[0];
  if (!primaryGuest) throw new Error("Visitante principal nao encontrado.");
  if (!primaryGuest.email) throw new Error("O visitante principal precisa de um e-mail valido.");

  return {
    request,
    guests,
    primaryGuest,
    resident: residentResult.data as ProfileRow,
    apartment: (apartmentResult.data as ApartmentRow | null) ?? null,
  };
}

export function apartmentLabel(apartment: ApartmentRow | null) {
  if (!apartment) return "unidade nao informada";
  return `${apartment.tower} - Andar ${apartment.level} - Ap ${apartment.number}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function issueRawToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export async function replaceToken(
  admin: ReturnType<typeof createServiceClient>,
  requestId: string,
  purpose: TokenPurpose,
  options?: { guestId?: string; actor?: "resident" | "gatekeeper" | null; expiresAt?: string | null },
) {
  await admin
    .from("visitor_flow_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const rawToken = issueRawToken();
  const tokenHash = await hashToken(rawToken);

  const insertResult = await admin.from("visitor_flow_tokens").insert({
    request_id: requestId,
    guest_id: options?.guestId ?? null,
    purpose,
    actor: options?.actor ?? null,
    token_hash: tokenHash,
    expires_at: options?.expiresAt ?? null,
  });

  if (insertResult.error) throw new Error(insertResult.error.message);
  return rawToken;
}

export async function findToken(
  admin: ReturnType<typeof createServiceClient>,
  rawToken: string,
  purpose: TokenPurpose,
) {
  const tokenHash = await hashToken(rawToken);
  const tokenResult = await admin
    .from("visitor_flow_tokens")
    .select("id, request_id, guest_id, purpose, actor, expires_at, consumed_at")
    .eq("token_hash", tokenHash)
    .eq("purpose", purpose)
    .maybeSingle();

  if (tokenResult.error) throw new Error(tokenResult.error.message);
  if (!tokenResult.data) throw new Error("Token de visitante invalido.");
  if (tokenResult.data.consumed_at) throw new Error("Este token ja foi utilizado.");
  if (tokenResult.data.expires_at && new Date(tokenResult.data.expires_at).getTime() < Date.now()) {
    throw new Error("Este token expirou.");
  }

  return tokenResult.data;
}

export function approvalLink(token: string) {
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";
  return `${appBaseUrl.replace(/\/$/, "")}/visitantes/aprovacao?token=${encodeURIComponent(token)}`;
}

export function qrPayload(token: string) {
  return `omni-visit:${token}`;
}

export async function createQrDataUrl(token: string) {
  return await QRCode.toDataURL(qrPayload(token), {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });
}

function emailLayout(title: string, body: string, footer?: string) {
  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 8px;">
          <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
          <h1 style="margin:14px 0 0;font-size:28px;line-height:1.1;">${title}</h1>
        </div>
        <div style="padding:20px 28px 28px;font-size:15px;line-height:1.7;color:#334155;">
          ${body}
          ${footer ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px;">${footer}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

export async function sendApprovalEmail(bundle: VisitorBundle, token: string) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const link = approvalLink(token);
  const from = Deno.env.get("VISITOR_FROM_EMAIL") ?? "Condominio <onboarding@resend.dev>";

  const html = emailLayout(
    "Confirme sua visita",
    `
      <p>Ola, <strong>${bundle.primaryGuest.full_name}</strong>.</p>
      <p>${bundle.resident.name ?? "Um morador"} cadastrou sua visita para ${apartmentLabel(bundle.apartment)}.</p>
      <p><strong>Check-in previsto:</strong> ${formatDateTime(bundle.request.expected_check_in)}<br />
      <strong>Check-out previsto:</strong> ${formatDateTime(bundle.request.expected_check_out)}</p>
      <p>Use o botao abaixo para confirmar os dados e liberar o proximo passo da entrada.</p>
      <p style="margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:16px;font-weight:700;">Confirmar visita</a>
      </p>
      <p>Se preferir, copie este link: <br /><span style="color:#4f46e5;word-break:break-all;">${link}</span></p>
    `,
    "Depois da confirmacao, voce recebera um novo e-mail com o QR code da visita.",
  );

  const result = await resend.emails.send({
    from,
    to: [bundle.primaryGuest.email ?? ""],
    subject: "Confirme sua visita ao condominio",
    html,
  });

  if (result.error) throw new Error(result.error.message);
}

export async function sendAccessEmail(bundle: VisitorBundle, token: string) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = Deno.env.get("VISITOR_FROM_EMAIL") ?? "Condominio <onboarding@resend.dev>";
  const qrDataUrl = await createQrDataUrl(token);
  const presenterLabel = bundle.request.requires_portaria_qr ? "na portaria" : "ao morador responsavel";

  const html = emailLayout(
    "Seu QR code esta pronto",
    `
      <p>Visita confirmada com sucesso, <strong>${bundle.primaryGuest.full_name}</strong>.</p>
      <p>Apresente este QR code ${presenterLabel} durante o check-in da sua visita em ${apartmentLabel(bundle.apartment)}.</p>
      <p><strong>Janela da visita:</strong> ${formatDateTime(bundle.request.expected_check_in)} ate ${formatDateTime(bundle.request.expected_check_out)}</p>
      <div style="margin:28px 0;padding:20px;border:1px solid #e2e8f0;border-radius:20px;background:#f8fafc;text-align:center;">
        <img src="${qrDataUrl}" alt="QR Code da visita" style="width:240px;max-width:100%;height:auto;" />
        <p style="margin:16px 0 0;font-size:12px;color:#64748b;">Codigo manual: ${qrPayload(token)}</p>
      </div>
    `,
    bundle.request.requires_portaria_qr
      ? "O QR code sera validado pela portaria para autenticar o check-in."
      : "O morador responsavel deve escanear este QR code para validar a visita.",
  );

  const result = await resend.emails.send({
    from,
    to: [bundle.primaryGuest.email ?? ""],
    subject: "QR code da sua visita",
    html,
  });

  if (result.error) throw new Error(result.error.message);
}

export async function notifyResident(
  admin: ReturnType<typeof createServiceClient>,
  bundle: VisitorBundle,
  title: string,
  message: string,
) {
  const result = await admin.from("system_notifications").insert({
    user_id: bundle.request.resident_id,
    title,
    message,
    category: "VISITANTES",
    link: "/visitantes",
  });

  if (result.error) throw new Error(result.error.message);
}
