import { supabase } from "../../../lib/supabase";

export type AvisoTipo = "Manutenção" | "Assembleia" | "Segurança" | "Informativo" | "Eventos";

export type Aviso = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: AvisoTipo;
  fixado: boolean;
  data_expiracao: string | null;
  arquivo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  curtidas_count: number;
  user_curtiu: boolean;
};

export type CreateAvisoPayload = {
  titulo: string;
  descricao: string;
  tipo: AvisoTipo;
  data_expiracao?: string;
  arquivo_url?: string;
};

export type Notificacao = {
  id: string;
  aviso_id?: string;
  lida: boolean;
  created_at: string;
  aviso_titulo?: string;
  aviso_tipo?: string;
  titulo?: string;
  mensagem?: string;
  categoria?: string;
  link?: string | null;
  origem: "avisos" | "system";
};

export const AVISO_TIPOS: AvisoTipo[] = ["Informativo", "Manutenção", "Assembleia", "Segurança", "Eventos"];

export const AVISO_TIPO_COLORS: Record<AvisoTipo, string> = {
  Informativo:  "bg-blue-50 text-blue-700 border-blue-200",
  Manutenção:   "bg-amber-50 text-amber-700 border-amber-200",
  Assembleia:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  Segurança:    "bg-red-50 text-red-700 border-red-200",
  Eventos:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ── Avisos ────────────────────────────────────────────────────────────────

export async function listAvisos(): Promise<Aviso[]> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const uid = authUser?.id ?? null;

  const { data, error } = await supabase
    .from("avisos")
    .select("*, profiles!created_by(name)")
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error("Erro ao carregar avisos.");

  const avisos: Aviso[] = (
    data as unknown as Array<Aviso & { profiles: { name: string } | null }>
  ).map((a) => ({
    ...a,
    author_name: a.profiles?.name ?? "—",
    curtidas_count: 0,
    user_curtiu: false,
    profiles: undefined,
  })) as Aviso[];

  if (avisos.length === 0) return avisos;

  // Curtidas separadas
  const ids = avisos.map((a) => a.id);
  const { data: curtidas } = await supabase
    .from("aviso_curtidas")
    .select("aviso_id, user_id")
    .in("aviso_id", ids);

  if (!curtidas) return avisos;

  const countMap: Record<string, number> = {};
  const userLiked = new Set<string>();
  for (const c of curtidas as Array<{ aviso_id: string; user_id: string }>) {
    countMap[c.aviso_id] = (countMap[c.aviso_id] ?? 0) + 1;
    if (uid && c.user_id === uid) userLiked.add(c.aviso_id);
  }

  return avisos.map((a) => ({
    ...a,
    curtidas_count: countMap[a.id] ?? 0,
    user_curtiu: userLiked.has(a.id),
  }));
}

export async function createAviso(payload: CreateAvisoPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("avisos").insert({
    ...payload,
    created_by: user.id,
    data_expiracao: payload.data_expiracao || null,
  });

  if (error) throw new Error(error.message);
}

export async function updateAviso(id: string, payload: Partial<CreateAvisoPayload>): Promise<void> {
  const { error } = await supabase
    .from("avisos")
    .update({ ...payload, data_expiracao: payload.data_expiracao || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadAvisoAnexo(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("avisos-anexos").upload(path, file, { upsert: false });
  if (error) throw new Error(`Erro no upload: ${error.message}`);
  const { data } = supabase.storage.from("avisos-anexos").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAviso(id: string): Promise<void> {
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleFixarAviso(id: string, currentFixado: boolean): Promise<void> {
  if (!currentFixado) {
    const { count } = await supabase
      .from("avisos")
      .select("id", { count: "exact", head: true })
      .eq("fixado", true);
    if ((count ?? 0) >= 3) throw new Error("Limite de 3 avisos fixados atingido.");
  }
  const { error } = await supabase
    .from("avisos")
    .update({ fixado: !currentFixado, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleCurtidaAviso(avisoId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: existing } = await supabase
    .from("aviso_curtidas")
    .select("aviso_id")
    .eq("aviso_id", avisoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("aviso_curtidas").delete()
      .eq("aviso_id", avisoId).eq("user_id", user.id);
  } else {
    await supabase.from("aviso_curtidas").insert({ aviso_id: avisoId, user_id: user.id });
  }
}

// ── Notificações ──────────────────────────────────────────────────────────

export async function listNotificacoes(): Promise<Notificacao[]> {
  const avisosPromise = supabase
    .from("notificacoes")
    .select("*, avisos(titulo, tipo)")
    .eq("lida", false)
    .order("created_at", { ascending: false });

  const systemPromise = supabase
    .from("system_notifications")
    .select("id, title, message, category, link, read, created_at")
    .eq("read", false)
    .order("created_at", { ascending: false });

  const [avisosResult, systemResult] = await Promise.all([avisosPromise, systemPromise]);

  type RawAviso = { id: string; aviso_id: string; lida: boolean; created_at: string; avisos: { titulo: string; tipo: string } | null };
  const avisos = avisosResult.error
    ? []
    : (avisosResult.data as unknown as RawAviso[]).map((n) => ({
        id: n.id,
        aviso_id: n.aviso_id,
        lida: n.lida,
        created_at: n.created_at,
        aviso_titulo: n.avisos?.titulo,
        aviso_tipo: n.avisos?.tipo,
        titulo: n.avisos?.titulo ?? "Novo aviso publicado",
        mensagem: n.avisos?.tipo ?? "Aviso",
        categoria: "AVISO",
        link: "/avisos",
        origem: "avisos" as const,
      }));

  type RawSystem = { id: string; title: string; message: string; category: string; link: string | null; read: boolean; created_at: string };
  const system = systemResult.error
    ? []
    : (systemResult.data as RawSystem[]).map((n) => ({
        id: n.id,
        lida: n.read,
        created_at: n.created_at,
        titulo: n.title,
        mensagem: n.message,
        categoria: n.category,
        link: n.link,
        origem: "system" as const,
      }));

  return [...avisos, ...system]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);
}

export async function marcarNotificacaoLida(notification: Pick<Notificacao, "id" | "origem">): Promise<void> {
  if (notification.origem === "system") {
    await supabase.from("system_notifications").update({ read: true }).eq("id", notification.id);
    return;
  }

  await supabase.from("notificacoes").update({ lida: true }).eq("id", notification.id);
}

export async function marcarTodasLidas(notificacoes: Notificacao[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const avisoIds = notificacoes.filter((item) => item.origem === "avisos").map((item) => item.id);
  const systemIds = notificacoes.filter((item) => item.origem === "system").map((item) => item.id);

  await Promise.all([
    avisoIds.length > 0
      ? supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).in("id", avisoIds)
      : Promise.resolve(),
    systemIds.length > 0
      ? supabase.from("system_notifications").update({ read: true }).eq("user_id", user.id).in("id", systemIds)
      : Promise.resolve(),
  ]);
}

export async function excluirNotificacao(id: string): Promise<void> {
  await supabase.from("notificacoes").delete().eq("id", id);
}
