import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type DeliveryStatus = "RECEBIDA" | "AVISADA" | "RETIRADA";

export type DeliveryApartmentOption = {
  id: string;
  tower: string;
  level: number;
  number: string;
  residentId: string;
  residentName: string;
};

export type Delivery = {
  id: string;
  apartmentId: string;
  apartmentLabel: string;
  residentId: string;
  recipientName: string;
  carrier: string;
  trackingCode: string;
  description: string;
  status: DeliveryStatus;
  notes: string;
  photoUrl: string;
  receivedAt: string;
  notifiedAt: string | null;
  pickedUpAt: string | null;
  pickedUpByName: string;
  createdByUserId: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeliveryInput = {
  apartmentId: string;
  carrier: string;
  trackingCode: string;
  description: string;
  notes: string;
  photoUrl?: string;
};

type DeliveryRow = {
  id: string;
  apartment_id: string;
  resident_id: string;
  recipient_name: string;
  carrier: string;
  tracking_code: string | null;
  description: string | null;
  status: DeliveryStatus;
  notes: string | null;
  photo_url: string | null;
  received_at: string;
  notified_at: string | null;
  picked_up_at: string | null;
  picked_up_by_name: string | null;
  created_by_user_id: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type ApartmentRow = {
  id: string;
  tower: string;
  level: number;
  number: string;
  resident_id: string | null;
  resident: { id: string; name: string }[] | { id: string; name: string } | null;
};

function apartmentLabel(apartment: { tower: string; level: number; number: string }) {
  return `${apartment.tower} · Andar ${apartment.level} · Ap ${apartment.number}`;
}

function mapDelivery(row: DeliveryRow, apartmentMap: Map<string, string>): Delivery {
  return {
    id: row.id,
    apartmentId: row.apartment_id,
    apartmentLabel: apartmentMap.get(row.apartment_id) ?? "Unidade vinculada",
    residentId: row.resident_id,
    recipientName: row.recipient_name,
    carrier: row.carrier,
    trackingCode: row.tracking_code ?? "",
    description: row.description ?? "",
    status: row.status,
    notes: row.notes ?? "",
    photoUrl: row.photo_url ?? "",
    receivedAt: row.received_at,
    notifiedAt: row.notified_at,
    pickedUpAt: row.picked_up_at,
    pickedUpByName: row.picked_up_by_name ?? "",
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getStoragePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function requireSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  return data.user;
}

async function getCondominioUUID(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuario_condominio")
    .select("condominio_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return (data as any)?.condominio_id ?? null;
}

export async function listDeliveryApartmentOptions(): Promise<DeliveryApartmentOption[]> {
  const condominioUUID = await getCondominioUUID();

  let query = supabase
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name)")
    .not("resident_id", "is", null)
    .order("tower", { ascending: true })
    .order("level", { ascending: true })
    .order("number", { ascending: true });

  if (condominioUUID) {
    query = query.or(`condominio_id.is.null,condominio_id.eq.${condominioUUID}`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return ((data ?? []) as ApartmentRow[])
    .map((row) => {
      const resident = Array.isArray(row.resident) ? row.resident[0] ?? null : row.resident;
      return { ...row, resident };
    })
    .filter((row) => row.resident_id && row.resident)
    .map((row) => ({
      id: row.id,
      tower: row.tower,
      level: row.level,
      number: row.number,
      residentId: row.resident_id as string,
      residentName: row.resident?.name ?? "Morador",
    }));
}

export async function listDeliveries(): Promise<Delivery[]> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();
  const condominioUUID = await getCondominioUUID();

  let query = supabase
    .from("deliveries")
    .select("id, apartment_id, resident_id, recipient_name, carrier, tracking_code, description, status, notes, photo_url, received_at, notified_at, picked_up_at, picked_up_by_name, created_by_user_id, created_by_name, created_at, updated_at")
    .order("received_at", { ascending: false });

  if (condominioUUID) {
    query = query.or(`condominio_id.is.null,condominio_id.eq.${condominioUUID}`);
  }

  if (currentUser?.role === "MORADOR") {
    query = query.eq("resident_id", authUser.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DeliveryRow[];
  const apartmentIds = Array.from(new Set(rows.map((row) => row.apartment_id)));
  const apartmentsResult =
    apartmentIds.length > 0
      ? await supabase.from("condo_apartments").select("id, tower, level, number").in("id", apartmentIds)
      : { data: [], error: null };

  if (apartmentsResult.error) throw new Error(apartmentsResult.error.message);

  const apartmentMap = new Map<string, string>();
  for (const apartment of apartmentsResult.data ?? []) {
    apartmentMap.set(apartment.id, apartmentLabel(apartment));
  }

  return rows.map((row) => mapDelivery(row, apartmentMap));
}

export async function createDelivery(input: CreateDeliveryInput): Promise<void> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();

  const { error } = await supabase.from("deliveries").insert({
    apartment_id: input.apartmentId,
    carrier: input.carrier.trim(),
    tracking_code: input.trackingCode.trim() || null,
    description: input.description.trim() || null,
    notes: input.notes.trim() || null,
    photo_url: input.photoUrl?.trim() || null,
    created_by_user_id: authUser.id,
    created_by_name: currentUser?.name?.trim() || authUser.email || "Portaria",
    condominio_id: currentUser?.condominioUUID ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function markDeliveryPickedUp(deliveryId: string, pickedUpByName: string): Promise<void> {
  const { error } = await supabase
    .from("deliveries")
    .update({
      status: "RETIRADA",
      picked_up_at: new Date().toISOString(),
      picked_up_by_name: pickedUpByName.trim() || null,
    })
    .eq("id", deliveryId);

  if (error) throw new Error(error.message);
}

export async function uploadDeliveryPhoto(file: File): Promise<string> {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A foto deve ter no maximo 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const upload = await supabase.storage.from("delivery-photos").upload(path, file, { upsert: false });
  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from("delivery-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteDelivery(delivery: Pick<Delivery, "id" | "photoUrl">): Promise<void> {
  const { error } = await supabase.from("deliveries").delete().eq("id", delivery.id);
  if (error) throw new Error(error.message);

  const path = getStoragePathFromPublicUrl(delivery.photoUrl, "delivery-photos");
  if (path) {
    await supabase.storage.from("delivery-photos").remove([path]);
  }
}

export function subscribeToDeliveries(onChange: () => void) {
  const channel = supabase
    .channel("deliveries-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
