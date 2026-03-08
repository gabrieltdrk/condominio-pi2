import { supabase } from "../lib/supabase";
import { getUser } from "./auth";

export type OcorrenciaStatus =
  | "Aberto"
  | "Em Análise"
  | "Em Atendimento"
  | "Pendente Terceiros"
  | "Concluído"
  | "Cancelado";

export type OcorrenciaUrgencia = "Baixa" | "Média" | "Alta";

export type Ocorrencia = {
  id: string;
  protocolo: string;
  categoria: string;
  localizacao: string;
  assunto: string;
  descricao: string;
  urgencia: OcorrenciaUrgencia;
  status: OcorrenciaStatus;
  created_by: string;
  responsavel: string | null;
  resposta_interna: string | null;
  resposta_morador: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
};

export type CreateOcorrenciaPayload = {
  categoria: string;
  localizacao: string;
  assunto: string;
  descricao: string;
  urgencia: OcorrenciaUrgencia;
};

export type UpdateOcorrenciaPayload = {
  status?: OcorrenciaStatus;
  responsavel?: string;
  resposta_interna?: string;
  resposta_morador?: string;
};

export async function listOcorrencias(limit?: number): Promise<Ocorrencia[]> {
  let query = supabase
    .from("ocorrencias")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error("Erro ao carregar ocorrências.");

  return (data as unknown as Array<Ocorrencia & { profiles: { name: string } | null }>).map((o) => ({
    ...o,
    author_name: o.profiles?.name ?? "—",
    profiles: undefined,
  })) as Ocorrencia[];
}

export async function createOcorrencia(payload: CreateOcorrenciaPayload): Promise<Ocorrencia> {
  const user = getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("ocorrencias")
    .insert({ ...payload, created_by: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Ocorrencia;
}

export async function updateOcorrencia(id: string, payload: UpdateOcorrenciaPayload): Promise<void> {
  const { error } = await supabase
    .from("ocorrencias")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
