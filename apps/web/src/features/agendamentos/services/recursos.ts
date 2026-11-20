import { supabase, getSupabaseAdmin } from "../../../lib/supabase";
import { getUser } from "../../auth/services/auth";

export type Recurso = {
  id: string;
  condominioId: string;
  nome: string;
  descricao: string | null;
  slug: string;
  icone: string;
  ativo: boolean;
  createdAt: string;
};

export type CreateRecursoPayload = {
  nome: string;
  descricao?: string;
  icone: string;
};

export const ICONE_OPTIONS = [
  { value: "salao",        label: "Salão"          },
  { value: "piscina",      label: "Piscina"        },
  { value: "reuniao",      label: "Reunião"        },
  { value: "academia",     label: "Academia"       },
  { value: "churrasqueira",label: "Churrasqueira"  },
  { value: "quadra",       label: "Quadra"         },
  { value: "default",      label: "Genérico"       },
] as const;

function toSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function mapRow(row: Record<string, unknown>): Recurso {
  return {
    id:           String(row.id),
    condominioId: String(row.condominio_id),
    nome:         String(row.nome),
    descricao:    (row.descricao as string | null) ?? null,
    slug:         String(row.slug),
    icone:        String(row.icone ?? "default"),
    ativo:        Boolean(row.ativo),
    createdAt:    String(row.created_at),
  };
}

function getCondominioId() {
  const u = getUser();
  if (!u?.condominioUUID) throw new Error("Condomínio não identificado.");
  return u.condominioUUID;
}

export async function listRecursos(apenasAtivos = false): Promise<Recurso[]> {
  const condominioId = getCondominioId();
  let q = supabase
    .from("recursos_condominio")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("created_at");
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createRecurso(payload: CreateRecursoPayload): Promise<void> {
  const condominioId = getCondominioId();
  const admin = getSupabaseAdmin();
  const slug = toSlug(payload.nome);
  const { error } = await admin.from("recursos_condominio").insert({
    condominio_id: condominioId,
    nome:     payload.nome.trim(),
    descricao: payload.descricao?.trim() || null,
    slug,
    icone:    payload.icone,
    ativo:    true,
  } as never);
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um recurso com este nome.");
    throw new Error(error.message);
  }
}

export async function updateRecurso(
  id: string,
  payload: Partial<{ nome: string; descricao: string; icone: string; ativo: boolean }>,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const update: Record<string, unknown> = { ...payload };
  if (payload.nome) {
    update.slug = toSlug(payload.nome);
    update.nome = payload.nome.trim();
  }
  const { error } = await admin.from("recursos_condominio").update(update as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRecurso(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("recursos_condominio").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
