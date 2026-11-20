import { supabase, getSupabaseAdmin } from "../../../lib/supabase";
import { getUser } from "../../auth/services/auth";

export type ContaTipo =
  | "conta_corrente"
  | "conta_poupanca"
  | "conta_bancaria"
  | "caixa"
  | "outro";

export const CONTA_TIPO_LABELS: Record<ContaTipo, string> = {
  conta_corrente: "Conta Corrente",
  conta_poupanca: "Conta Poupança",
  conta_bancaria: "Conta Bancária",
  caixa: "Caixa",
  outro: "Outro",
};

export type ContaBancaria = {
  id: string;
  condominio_id: string;
  nome: string;
  tipo: ContaTipo;
  banco: string;
  agencia: string;
  numero: string;
  created_at: string;
};

export type CreateContaPayload = Omit<ContaBancaria, "id" | "created_at" | "condominio_id">;

function getCondominioId(): string {
  const u = getUser();
  if (!u?.condominioUUID) throw new Error("Condomínio não identificado.");
  return u.condominioUUID;
}

export async function listContas(): Promise<ContaBancaria[]> {
  const condominioId = getCondominioId();
  const { data, error } = await supabase
    .from("contas_bancarias")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as ContaBancaria[];
}

export async function createConta(payload: CreateContaPayload): Promise<void> {
  const condominioId = getCondominioId();
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("contas_bancarias").insert({
    ...payload,
    condominio_id: condominioId,
  } as never);
  if (error) throw new Error(error.message);
}

export async function updateConta(id: string, payload: Partial<CreateContaPayload>): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("contas_bancarias")
    .update(payload as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteConta(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("contas_bancarias").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
