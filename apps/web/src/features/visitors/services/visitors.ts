import { FunctionsHttpError } from "@supabase/supabase-js";
import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type VisitorRequestStatus =
  | "PENDENTE_CONFIRMACAO"
  | "CONFIRMADO"
  | "VALIDADO_MORADOR"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELADO";

export type VisitorGuestInput = {
  fullName: string;
  birthDate: string;
  cpf: string;
  email: string;
  isPrimary?: boolean;
};

export type VisitorRequestInput = {
  apartmentId: string | null;
  adultsCount: number;
  childrenCount: number;
  petsCount: number;
  expectedCheckIn: string;
  expectedCheckOut: string;
  requiresPortariaQr: boolean;
  notes: string;
  guests: VisitorGuestInput[];
};

export type VisitorGuest = {
  id: string;
  requestId: string;
  fullName: string;
  birthDate: string;
  cpf: string;
  email: string;
  isPrimary: boolean;
};

export type VisitorRequest = {
  id: string;
  residentId: string;
  residentName: string;
  apartmentId: string | null;
  apartmentLabel: string;
  status: VisitorRequestStatus;
  requiresPortariaQr: boolean;
  adultsCount: number;
  childrenCount: number;
  petsCount: number;
  expectedCheckIn: string;
  expectedCheckOut: string;
  notes: string;
  confirmationEmailSentAt: string | null;
  principalConfirmedAt: string | null;
  residentValidatedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  guests: VisitorGuest[];
  primaryGuest: VisitorGuest | null;
};

type VisitorRequestRow = {
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
  confirmation_email_sent_at: string | null;
  principal_confirmed_at: string | null;
  resident_validated_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
};

type VisitorGuestRow = {
  id: string;
  request_id: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  email: string | null;
  is_primary: boolean;
};

type FunctionErrorPayload = {
  error?: string;
  message?: string;
};

export type VisitorAccessCard = {
  qrDataUrl: string;
  manualCode: string;
  expectedCheckIn: string;
  expectedCheckOut: string;
};

export type VisitorFlowResult = {
  requestId: string;
  emailQueued: boolean;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeGuests(guests: VisitorGuestInput[]) {
  return guests.map((guest, index) => ({
    full_name: guest.fullName.trim(),
    birth_date: guest.birthDate,
    cpf: digitsOnly(guest.cpf),
    email: guest.email.trim() || null,
    is_primary: guest.isPrimary ?? index === 0,
  }));
}

async function extractFunctionError(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const payload = (await error.context.clone().json()) as FunctionErrorPayload;
      const message = payload.error ?? payload.message;
      if (message) return message;
    } catch {
      return fallback;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function ensureNoConflictingRequest(apartmentId: string, expectedCheckIn: string, expectedCheckOut: string) {
  const { data, error } = await supabase
    .from("visitor_requests")
    .select("id")
    .eq("apartment_id", apartmentId)
    .not("status", "in", '("CANCELADO","CHECKED_OUT")')
    .lt("expected_check_in", expectedCheckOut)
    .gt("expected_check_out", expectedCheckIn)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if ((data ?? []).length > 0) {
    throw new Error("Já existe uma visita ativa para esta unidade na janela informada.");
  }
}

function mapGuest(row: VisitorGuestRow): VisitorGuest {
  return {
    id: row.id,
    requestId: row.request_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    cpf: row.cpf,
    email: row.email ?? "",
    isPrimary: row.is_primary,
  };
}

export async function listVisitorRequests(): Promise<VisitorRequest[]> {
  const storedUser = getUser();
  const authResult = await supabase.auth.getUser();
  const currentUserId = authResult.data.user?.id ?? null;

  const { data: ucData } = await supabase
    .from("usuario_condominio")
    .select("condominio_id")
    .eq("user_id", currentUserId ?? "")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const condominioUUID: string | null = (ucData as any)?.condominio_id ?? null;

  let query = supabase
    .from("visitor_requests")
    .select(
      "id, resident_id, apartment_id, status, requires_portaria_qr, adults_count, children_count, pets_count, expected_check_in, expected_check_out, notes, confirmation_email_sent_at, principal_confirmed_at, resident_validated_at, checked_in_at, checked_out_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (condominioUUID) {
    query = query.or(`condominio_id.is.null,condominio_id.eq.${condominioUUID}`);
  }

  if (storedUser?.role === "MORADOR" && currentUserId) {
    query = query.eq("resident_id", currentUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data ?? []) as VisitorRequestRow[];
  if (requests.length === 0) return [];

  const requestIds = requests.map((request) => request.id);
  const residentIds = Array.from(new Set(requests.map((request) => request.resident_id)));
  const apartmentIds = Array.from(new Set(requests.map((request) => request.apartment_id).filter((value): value is string => Boolean(value))));

  const [guestsResult, profilesResult, apartmentsResult] = await Promise.all([
    supabase
      .from("visitor_request_guests")
      .select("id, request_id, full_name, birth_date, cpf, email, is_primary")
      .in("request_id", requestIds)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name, email").in("id", residentIds),
    apartmentIds.length > 0
      ? supabase.from("condo_apartments").select("id, tower, level, number").in("id", apartmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (guestsResult.error) throw new Error(guestsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (apartmentsResult.error) throw new Error(apartmentsResult.error.message);

  const guestsByRequest = new Map<string, VisitorGuest[]>();
  for (const guest of (guestsResult.data ?? []) as VisitorGuestRow[]) {
    const current = guestsByRequest.get(guest.request_id) ?? [];
    current.push(mapGuest(guest));
    guestsByRequest.set(guest.request_id, current);
  }

  const residentMap = new Map<string, string>();
  for (const profile of profilesResult.data ?? []) {
    residentMap.set(profile.id as string, ((profile.name as string | null) ?? (profile.email as string | null) ?? "Morador").trim());
  }

  const apartmentMap = new Map<string, string>();
  for (const apartment of apartmentsResult.data ?? []) {
    apartmentMap.set(apartment.id as string, `${apartment.tower as string} · Andar ${String(apartment.level)} · Ap ${String(apartment.number)}`);
  }

  return requests.map((row) => {
    const guests = guestsByRequest.get(row.id) ?? [];
    return {
      id: row.id,
      residentId: row.resident_id,
      residentName: residentMap.get(row.resident_id) ?? "Morador",
      apartmentId: row.apartment_id,
      apartmentLabel: row.apartment_id ? apartmentMap.get(row.apartment_id) ?? "Unidade vinculada" : "Sem unidade",
      status: row.status,
      requiresPortariaQr: row.requires_portaria_qr,
      adultsCount: row.adults_count,
      childrenCount: row.children_count,
      petsCount: row.pets_count,
      expectedCheckIn: row.expected_check_in,
      expectedCheckOut: row.expected_check_out,
      notes: row.notes ?? "",
      confirmationEmailSentAt: row.confirmation_email_sent_at,
      principalConfirmedAt: row.principal_confirmed_at,
      residentValidatedAt: row.resident_validated_at,
      checkedInAt: row.checked_in_at,
      checkedOutAt: row.checked_out_at,
      createdAt: row.created_at,
      guests,
      primaryGuest: guests.find((guest) => guest.isPrimary) ?? guests[0] ?? null,
    };
  });
}

export async function createVisitorRequest(input: VisitorRequestInput): Promise<VisitorFlowResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  const storedUser = getUser();
  if (storedUser?.role === "PORTEIRO") {
    throw new Error("A portaria não pode cadastrar visitas.");
  }

  const guests = normalizeGuests(input.guests);
  if (guests.length === 0) {
    throw new Error("Adicione ao menos um visitante.");
  }

  const primaryGuest = guests.find((guest) => guest.is_primary) ?? guests[0];
  if (!primaryGuest.email) {
    throw new Error("Informe o e-mail do visitante principal.");
  }

  if (!input.apartmentId) {
    throw new Error("Selecione a unidade da visita.");
  }

  if (storedUser?.role === "MORADOR") {
    const { data: apartment, error: apartmentError } = await supabase
      .from("condo_apartments")
      .select("id, resident_id")
      .eq("id", input.apartmentId)
      .maybeSingle();

    if (apartmentError) {
      throw new Error(apartmentError.message);
    }

    if (!apartment || apartment.resident_id !== authData.user.id) {
      throw new Error("Você só pode cadastrar visitantes para uma unidade vinculada ao seu perfil.");
    }
  }

  await ensureNoConflictingRequest(input.apartmentId, input.expectedCheckIn, input.expectedCheckOut);

  const { data: inserted, error } = await supabase
    .from("visitor_requests")
    .insert({
      resident_id: authData.user.id,
      apartment_id: input.apartmentId,
      adults_count: input.adultsCount,
      children_count: input.childrenCount,
      pets_count: input.petsCount,
      expected_check_in: input.expectedCheckIn,
      expected_check_out: input.expectedCheckOut,
      requires_portaria_qr: input.requiresPortariaQr,
      notes: input.notes.trim() || null,
      condominio_id: storedUser?.condominioUUID ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Não foi possível criar a visita.");
  }

  const { error: guestsError } = await supabase.from("visitor_request_guests").insert(
    guests.map((guest) => ({
      ...guest,
      request_id: inserted.id,
    })),
  );

  if (guestsError) {
    throw new Error(guestsError.message);
  }

  const emailQueued = await sendVisitorInvitation(inserted.id);
  return {
    requestId: inserted.id,
    emailQueued,
  };
}

export async function sendVisitorInvitation(requestId: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const result = await supabase.functions.invoke("visitor-dispatch", {
    body: { requestId },
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  if (result.error) {
    return false;
  }

  return true;
}

export async function cancelVisitorRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("visitor_requests")
    .update({ status: "CANCELADO" })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVisitorRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("visitor_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeVisitorCheckOut(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("visitor_requests")
    .update({
      status: "CHECKED_OUT",
      checked_out_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approveVisitorByToken(token: string): Promise<{ status: VisitorRequestStatus; requiresPortariaQr: boolean }> {
  try {
    const result = await supabase.functions.invoke("visitor-approval", {
      body: { token },
    });

    if (result.error) {
      throw result.error;
    }

    return {
      status: (result.data?.status ?? "CONFIRMADO") as VisitorRequestStatus,
      requiresPortariaQr: Boolean(result.data?.requiresPortariaQr),
    };
  } catch (error) {
    throw new Error(await extractFunctionError(error, "Não foi possível confirmar esta visita."));
  }
}

export async function validateVisitorAccessToken(token: string): Promise<{ status: VisitorRequestStatus; actor: "resident" | "gatekeeper" }> {
  try {
    const result = await supabase.functions.invoke("visitor-checkin", {
      body: { token },
    });

    if (result.error) {
      throw result.error;
    }

    return {
      status: (result.data?.status ?? "CHECKED_IN") as VisitorRequestStatus,
      actor: (result.data?.actor ?? "gatekeeper") as "resident" | "gatekeeper",
    };
  } catch (error) {
    throw new Error(await extractFunctionError(error, "Erro ao validar QR."));
  }
}

export async function fetchVisitorAccessCard(token: string): Promise<VisitorAccessCard> {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/functions/v1/visitor-access-card?token=${encodeURIComponent(token)}&format=json`, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<VisitorAccessCard> & FunctionErrorPayload;
  if (!response.ok) {
    throw new Error(payload.error ?? payload.message ?? "Nao foi possivel abrir este QR code.");
  }

  if (!payload.qrDataUrl || !payload.manualCode || !payload.expectedCheckIn || !payload.expectedCheckOut) {
    throw new Error("Resposta invalida ao carregar o QR code.");
  }

  return {
    qrDataUrl: payload.qrDataUrl,
    manualCode: payload.manualCode,
    expectedCheckIn: payload.expectedCheckIn,
    expectedCheckOut: payload.expectedCheckOut,
  };
}

export function subscribeToVisitorRequests(onChange: () => void) {
  const requestsChannel = supabase
    .channel("visitor-requests-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "visitor_requests" }, onChange)
    .subscribe();

  const guestsChannel = supabase
    .channel("visitor-guests-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "visitor_request_guests" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(requestsChannel);
    void supabase.removeChannel(guestsChannel);
  };
}
