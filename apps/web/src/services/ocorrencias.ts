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
  curtidas_count: number;
  user_curtiu: boolean;
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

// Prioridade automática por categoria
export const PRIORIDADE_POR_CATEGORIA: Record<string, OcorrenciaUrgencia> = {
  Manutenção: "Alta",
  Barulho: "Média",
  Reclamação: "Média",
  Sugestão: "Baixa",
  Dúvida: "Baixa",
};


export async function listOcorrencias(limit?: number): Promise<Ocorrencia[]> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const uid = authUser?.id ?? null;

  // Query principal — apenas ocorrências + perfil do autor
  let q = supabase
    .from("ocorrencias")
    .select("*, profiles!created_by(name)")
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw new Error("Erro ao carregar ocorrências.");

  const ocorrencias: Ocorrencia[] = (
    data as unknown as Array<Omit<Ocorrencia, "author_name" | "curtidas_count" | "user_curtiu"> & { profiles: { name: string } | null }>
  ).map((o) => ({
    ...o,
    author_name: o.profiles?.name ?? "—",
    curtidas_count: 0,
    user_curtiu: false,
    profiles: undefined,
  })) as Ocorrencia[];

  if (ocorrencias.length === 0) return ocorrencias;

  // Busca curtidas separado — não quebra se a tabela não existir
  const ids = ocorrencias.map((o) => o.id);
  const { data: curtidas } = await supabase
    .from("ocorrencia_curtidas")
    .select("ocorrencia_id, user_id")
    .in("ocorrencia_id", ids);

  if (!curtidas) return ocorrencias;

  const countMap: Record<string, number> = {};
  const userLiked = new Set<string>();
  for (const c of curtidas as Array<{ ocorrencia_id: string; user_id: string }>) {
    countMap[c.ocorrencia_id] = (countMap[c.ocorrencia_id] ?? 0) + 1;
    if (uid && c.user_id === uid) userLiked.add(c.ocorrencia_id);
  }

  return ocorrencias.map((o) => ({
    ...o,
    curtidas_count: countMap[o.id] ?? 0,
    user_curtiu: userLiked.has(o.id),
  }));
}

export async function createOcorrencia(payload: CreateOcorrenciaPayload): Promise<Ocorrencia> {
  if (!getUser()) throw new Error("Usuário não autenticado.");

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("ocorrencias")
    .insert({ ...payload, created_by: authUser.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...(data as Ocorrencia), curtidas_count: 0, user_curtiu: false };
}

export async function updateOcorrencia(id: string, payload: UpdateOcorrenciaPayload): Promise<void> {
  const { error } = await supabase
    .from("ocorrencias")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function toggleCurtida(ocorrenciaId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: existing } = await supabase
    .from("ocorrencia_curtidas")
    .select("ocorrencia_id")
    .eq("ocorrencia_id", ocorrenciaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ocorrencia_curtidas")
      .delete()
      .eq("ocorrencia_id", ocorrenciaId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("ocorrencia_curtidas")
      .insert({ ocorrencia_id: ocorrenciaId, user_id: user.id });
  }
}
