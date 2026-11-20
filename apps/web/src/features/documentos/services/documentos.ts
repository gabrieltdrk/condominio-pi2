import { supabase } from "../../../lib/supabase";
import { getCondominioUUIDAsync } from "../../../lib/condominio";

export const DOCUMENT_TYPES = [
  { value: "convencao", label: "Convenção de Condomínio", guarda: "Permanente" },
  { value: "regimento", label: "Regimento Interno", guarda: "Permanente" },
  { value: "cnpj", label: "CNPJ", guarda: "Permanente" },
  { value: "ata", label: "Ata de Assembleia", guarda: "Permanente" },
  { value: "habite_se", label: "Habite-se", guarda: "Permanente" },
  { value: "avcb", label: "AVCB (Corpo de Bombeiros)", guarda: "5 anos" },
  { value: "laudo_elevador", label: "Laudo - Elevador (RIA)", guarda: "5 anos" },
  { value: "laudo_para_raios", label: "Laudo - Para-raios (SPDA)", guarda: "5 anos" },
  { value: "laudo_agua", label: "Laudo - Caixa d'água", guarda: "5 anos" },
  { value: "seguro", label: "Seguro Obrigatório", guarda: "5 anos" },
  { value: "balancete", label: "Balancete / Extrato Bancário", guarda: "10 anos" },
  { value: "funcionarios", label: "Documentos de Funcionários", guarda: "10 anos" },
  { value: "cnd", label: "Certidão Negativa de Débitos (CND)", guarda: "5 anos" },
  { value: "outro", label: "Outro", guarda: "Variável" },
] as const;

export type DocumentoTipo = (typeof DOCUMENT_TYPES)[number]["value"];

export type Documento = {
  id: string;
  condominioId: string;
  nome: string;
  tipo: DocumentoTipo;
  tipoLabel: string;
  descricao: string | null;
  dataValidade: string | null;
  arquivoUrl: string | null;
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  criadoPor: string | null;
  criadoPorNome: string | null;
  renovadoDe: string | null;
  ativo: boolean;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): Documento {
  const tipo = (row.tipo as string) as DocumentoTipo;
  const tipoLabel = DOCUMENT_TYPES.find(t => t.value === tipo)?.label ?? tipo;
  return {
    id: row.id as string,
    condominioId: row.condominio_id as string,
    nome: row.nome as string,
    tipo,
    tipoLabel,
    descricao: (row.descricao as string | null) ?? null,
    dataValidade: (row.data_validade as string | null) ?? null,
    arquivoUrl: (row.arquivo_url as string | null) ?? null,
    arquivoNome: (row.arquivo_nome as string | null) ?? null,
    arquivoTamanho: (row.arquivo_tamanho as number | null) ?? null,
    criadoPor: (row.criado_por as string | null) ?? null,
    criadoPorNome: (row.profiles as { name: string } | null)?.name ?? null,
    renovadoDe: (row.renovado_de as string | null) ?? null,
    ativo: row.ativo as boolean,
    createdAt: row.created_at as string,
  };
}

export async function listDocumentos(): Promise<Documento[]> {
  const condominioId = await getCondominioUUIDAsync();
  let query = supabase
    .from("condominio_documentos")
    .select("*, profiles(name)")
    .eq("ativo", true)
    .order("created_at", { ascending: false });
  if (condominioId) {
    query = query.eq("condominio_id", condominioId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getDocumento(id: string): Promise<Documento | null> {
  const { data, error } = await supabase
    .from("condominio_documentos")
    .select("*, profiles(name)")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getDocumentoHistorico(id: string): Promise<Documento[]> {
  const result: Documento[] = [];
  let currentId: string | null = id;
  while (currentId) {
    const doc = await getDocumento(currentId);
    if (!doc) break;
    result.push(doc);
    currentId = doc.renovadoDe;
  }
  return result;
}

async function uploadArquivo(file: File, condominioId: string, docId: string): Promise<{ url: string; nome: string; tamanho: number }> {
  const ext = file.name.split(".").pop();
  const path = `${condominioId}/${docId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("documentos-condominio").upload(path, file, { upsert: true });
  if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from("documentos-condominio").getPublicUrl(path);
  return { url: publicUrl, nome: file.name, tamanho: file.size };
}

async function agendarNotificacoes(docId: string, nome: string, dataValidade: string) {
  const expDate = new Date(dataValidade + "T12:00:00");
  const threeDaysBefore = new Date(expDate);
  threeDaysBefore.setDate(expDate.getDate() - 3);

  const notifs = [
    {
      title: `Documento expira em 3 dias: ${nome}`,
      message: `O documento "${nome}" vence em ${expDate.toLocaleDateString("pt-BR")}.`,
      category: "DOCUMENTO",
      link: `/predio/documentos/${docId}`,
      read: false,
      created_at: threeDaysBefore.toISOString(),
    },
    {
      title: `Documento vence hoje: ${nome}`,
      message: `O documento "${nome}" precisa ser renovado hoje.`,
      category: "DOCUMENTO",
      link: `/predio/documentos/${docId}`,
      read: false,
      created_at: expDate.toISOString(),
    },
  ];

  const now = new Date();
  const toInsert = notifs.filter(n => new Date(n.created_at) >= now);
  if (toInsert.length > 0) {
    await supabase.from("system_notifications").insert(toInsert);
  }
}

async function cancelarNotificacoesDoc(docId: string) {
  await supabase
    .from("system_notifications")
    .update({ read: true })
    .eq("link", `/predio/documentos/${docId}`)
    .eq("read", false);
}

export async function createDocumento(input: {
  nome: string;
  tipo: DocumentoTipo;
  descricao?: string;
  dataValidade?: string | null;
  arquivo?: File | null;
}): Promise<Documento> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Sessão inválida.");
  const condominioId = await getCondominioUUIDAsync();
  if (!condominioId) throw new Error("Condomínio não selecionado.");

  const docId = crypto.randomUUID();
  let arquivoUrl: string | null = null;
  let arquivoNome: string | null = null;
  let arquivoTamanho: number | null = null;

  if (input.arquivo) {
    const up = await uploadArquivo(input.arquivo, condominioId, docId);
    arquivoUrl = up.url;
    arquivoNome = up.nome;
    arquivoTamanho = up.tamanho;
  }

  const { data, error } = await supabase.from("condominio_documentos").insert({
    id: docId,
    condominio_id: condominioId,
    nome: input.nome.trim(),
    tipo: input.tipo,
    descricao: input.descricao?.trim() || null,
    data_validade: input.dataValidade || null,
    arquivo_url: arquivoUrl,
    arquivo_nome: arquivoNome,
    arquivo_tamanho: arquivoTamanho,
    criado_por: user.id,
    ativo: true,
  }).select("*, profiles(name)").single();

  if (error) throw new Error(error.message);

  if (input.dataValidade) {
    await agendarNotificacoes(docId, input.nome.trim(), input.dataValidade);
  }

  return mapRow(data as Record<string, unknown>);
}

export async function renovarDocumento(oldId: string, input: {
  nome?: string;
  descricao?: string;
  dataValidade?: string | null;
  arquivo?: File | null;
}): Promise<Documento> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Sessão inválida.");

  const old = await getDocumento(oldId);
  if (!old) throw new Error("Documento não encontrado.");

  const condominioId = await getCondominioUUIDAsync();
  if (!condominioId) throw new Error("Condomínio não selecionado.");

  const docId = crypto.randomUUID();
  let arquivoUrl = old.arquivoUrl;
  let arquivoNome = old.arquivoNome;
  let arquivoTamanho = old.arquivoTamanho;

  if (input.arquivo) {
    const up = await uploadArquivo(input.arquivo, condominioId, docId);
    arquivoUrl = up.url;
    arquivoNome = up.nome;
    arquivoTamanho = up.tamanho;
  }

  await supabase.from("condominio_documentos").update({ ativo: false }).eq("id", oldId);
  await cancelarNotificacoesDoc(oldId);

  const nome = input.nome?.trim() || old.nome;

  const { data, error } = await supabase.from("condominio_documentos").insert({
    id: docId,
    condominio_id: condominioId,
    nome,
    tipo: old.tipo,
    descricao: input.descricao?.trim() ?? old.descricao,
    data_validade: input.dataValidade ?? null,
    arquivo_url: arquivoUrl,
    arquivo_nome: arquivoNome,
    arquivo_tamanho: arquivoTamanho,
    criado_por: user.id,
    renovado_de: oldId,
    ativo: true,
  }).select("*, profiles(name)").single();

  if (error) throw new Error(error.message);

  if (input.dataValidade) {
    await agendarNotificacoes(docId, nome, input.dataValidade);
  }

  return mapRow(data as Record<string, unknown>);
}

export async function deleteDocumento(id: string): Promise<void> {
  await cancelarNotificacoesDoc(id);
  await supabase.from("condominio_documentos").update({ ativo: false }).eq("id", id);
}

export function getDocumentoStatus(dataValidade: string | null): "sem_validade" | "valido" | "expirando" | "expirado" {
  if (!dataValidade) return "sem_validade";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(dataValidade + "T12:00:00");
  const diff = Math.floor((val.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "expirado";
  if (diff <= 3) return "expirando";
  return "valido";
}

export function formatDataValidade(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export function formatTamanho(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
