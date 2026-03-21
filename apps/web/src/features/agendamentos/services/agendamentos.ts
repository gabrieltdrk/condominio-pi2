import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type ResourceBooking = {
  id: string;
  resourceId: string;
  date: string;
  time: string;
  duration: string;
  note: string;
  createdAt: string;
  userId: string | null;
  authorName: string;
};

type BookingRow = {
  id: number;
  resource_id: string;
  booking_date: string;
  booking_time: string;
  duration: string;
  note: string | null;
  created_at: string;
  user_id: string | null;
};

function mapRow(row: BookingRow, profileMap: Map<string, string>): ResourceBooking {
  return {
    id: String(row.id),
    resourceId: row.resource_id,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    duration: row.duration,
    note: row.note ?? "",
    createdAt: row.created_at,
    userId: row.user_id,
    authorName: (row.user_id ? profileMap.get(row.user_id) : null) || "Morador",
  };
}

export async function listResourceBookings(): Promise<ResourceBooking[]> {
  const { data, error } = await supabase
    .from("resource_bookings")
    .select("id, resource_id, booking_date, booking_time, duration, note, created_at, user_id")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as BookingRow[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value): value is string => !!value)));
  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id as string, ((profile.name as string | null) ?? (profile.email as string | null) ?? "Morador").trim());
    }
  }

  return rows.map((row) => mapRow(row, profileMap));
}

export async function createResourceBooking(input: {
  resourceId: string;
  date: string;
  time: string;
  duration: string;
  note: string;
}): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("resource_bookings")
    .select("id")
    .eq("resource_id", input.resourceId)
    .eq("booking_date", input.date)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error("Esta data ja esta reservada para este local.");
  }

  const { error } = await supabase.from("resource_bookings").insert({
    resource_id: input.resourceId,
    booking_date: input.date,
    booking_time: input.time,
    duration: input.duration,
    note: input.note.trim() || null,
    user_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esta data ja esta reservada para este local.");
    }
    throw new Error(error.message);
  }
}

export async function cancelResourceBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from("resource_bookings").delete().eq("id", Number(bookingId));

  if (error) {
    throw new Error(error.message);
  }
}

export function canCancelResourceBooking(booking: ResourceBooking) {
  const currentUser = getUser();
  if (!currentUser) return false;
  if (currentUser.role === "ADMIN") return true;

  return booking.userId !== null;
}

export function subscribeToResourceBookings(onChange: () => void) {
  const channel = supabase
    .channel("resource-bookings-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "resource_bookings" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
