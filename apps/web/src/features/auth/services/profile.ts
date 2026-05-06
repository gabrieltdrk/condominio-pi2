import { supabase } from "../../../lib/supabase";
import {
  getUser,
  setStoredUser,
  type ResidentType,
  type User,
  type UserStatus,
} from "./auth";

type ProfileRow = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  resident_type?: ResidentType | null;
  status?: UserStatus | null;
  avatar_url?: string | null;
};

type SaveProfileInput = {
  name: string;
  email: string;
  phone: string;
  carPlate: string;
  petsCount?: number;
};

const PROFILE_AVATARS_BUCKET = "profile-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function fetchProfile(id: string): Promise<ProfileRow | null> {
  const extended = await supabase
    .from("profiles")
    .select("name, role, phone, car_plate, pets_count, resident_type, status, avatar_url")
    .eq("id", id)
    .single();

  if (!extended.error) {
    return extended.data as ProfileRow;
  }

  const fallback = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", id)
    .single();

  if (fallback.error) return null;
  return fallback.data as ProfileRow;
}

async function fetchCondominioUUID(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("usuario_condominio")
    .select("condominio_id")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return (data as any)?.condominio_id ?? null;
}

function mergeUser(id: string, email: string, profile: ProfileRow | null, condominioUUID?: string | null) {
  const current = getUser();
  const next: User = {
    id,
    name: profile?.name ?? current?.name ?? email,
    email,
    phone: profile?.phone ?? "",
    role: (profile?.role ?? current?.role ?? "MORADOR") as User["role"],
    condominioUUID: condominioUUID !== undefined ? condominioUUID : (current?.condominioUUID ?? null),
    residentType: profile?.resident_type ?? current?.residentType ?? undefined,
    status: profile?.status ?? current?.status ?? undefined,
    carPlate: profile?.car_plate ?? current?.carPlate ?? undefined,
    petsCount: profile?.pets_count ?? current?.petsCount ?? undefined,
    avatarUrl: profile?.avatar_url ?? current?.avatarUrl ?? undefined,
  };

  setStoredUser(next);
  return next;
}

export async function refreshStoredUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  const uid = data.session.user.id;
  const email = data.session.user.email ?? "";

  const [profile, condominioUUID] = await Promise.all([
    fetchProfile(uid),
    fetchCondominioUUID(uid),
  ]);

  return mergeUser(uid, email, profile, condominioUUID);
}

export async function saveOwnProfile(input: SaveProfileInput): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const email = input.email.trim();
  const currentEmail = data.user.email?.trim() ?? "";

  if (email && email.toLowerCase() !== currentEmail.toLowerCase()) {
    const updateAuth = await supabase.auth.updateUser({
      email,
      data: {
        name: input.name.trim(),
        phone: input.phone || null,
        car_plate: input.carPlate || null,
        pets_count: input.petsCount ?? 0,
      },
    });

    if (updateAuth.error) {
      throw new Error(updateAuth.error.message);
    }
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      email,
      phone: input.phone || null,
      car_plate: input.carPlate || null,
      pets_count: input.petsCount ?? 0,
    } as never)
    .eq("id", data.user.id)
    .select("id")
    .maybeSingle();

  if (profileUpdate.error) {
    throw new Error(profileUpdate.error.message);
  }

  if (!profileUpdate.data) {
    throw new Error("Perfil nao encontrado para atualizacao. Avise o administrador para vincular seu cadastro.");
  }

  const freshProfile = await fetchProfile(data.user.id);
  if (!freshProfile) {
    throw new Error("Os dados foram enviados, mas nao foi possivel confirmar o perfil salvo.");
  }

  return mergeUser(data.user.id, email, freshProfile);
}

function getFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
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

async function updateAvatarUrl(userId: string, avatarUrl: string | null): Promise<User> {
  const profileUpdate = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl } as never)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (profileUpdate.error) {
    throw new Error(profileUpdate.error.message);
  }

  const freshProfile = await fetchProfile(userId);
  if (!freshProfile) {
    throw new Error("A foto foi enviada, mas nao foi possivel atualizar o perfil.");
  }

  return mergeUser(userId, getUser()?.email ?? "", freshProfile);
}

export async function uploadOwnProfileAvatar(file: File): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("A foto deve ter no maximo 5 MB.");
  }

  const currentProfile = await fetchProfile(data.user.id);
  const previousPath = getStoragePathFromPublicUrl(currentProfile?.avatar_url, PROFILE_AVATARS_BUCKET);
  const extension = getFileExtension(file);
  const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;

  const upload = await supabase.storage.from(PROFILE_AVATARS_BUCKET).upload(path, file, { upsert: false });
  if (upload.error) {
    throw new Error(`Erro no upload da foto: ${upload.error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path);
  const user = await updateAvatarUrl(data.user.id, publicUrlData.publicUrl);

  if (previousPath) {
    await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([previousPath]);
  }

  return user;
}

export async function removeOwnProfileAvatar(): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const currentProfile = await fetchProfile(data.user.id);
  const previousPath = getStoragePathFromPublicUrl(currentProfile?.avatar_url, PROFILE_AVATARS_BUCKET);
  const user = await updateAvatarUrl(data.user.id, null);

  if (previousPath) {
    await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([previousPath]);
  }

  return user;
}
