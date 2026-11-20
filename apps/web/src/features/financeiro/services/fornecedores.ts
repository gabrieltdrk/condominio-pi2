import { supabase } from "../../../lib/supabase";
import { getUser } from "../../auth/services/auth";
import type { ExpenseCategory } from "../../../pages/financeiro/utils/finance-calc";

export type Fornecedor = {
  id: string;
  condominio_id: string;
  nome: string;
  cnpj: string | null;
  categoria: ExpenseCategory;
  telefone: string | null;
  email: string | null;
  notes: string | null;
  ativo: boolean;
  created_at: string;
};

export type CreateFornecedorPayload = {
  nome: string;
  cnpj?: string | null;
  categoria: ExpenseCategory;
  telefone?: string | null;
  email?: string | null;
  notes?: string | null;
};

function getCondominioUUID(): string {
  const uuid = getUser()?.condominioUUID;
  if (!uuid) throw new Error("Condomínio não identificado.");
  return uuid;
}

export async function listFornecedores(apenasAtivos = true): Promise<Fornecedor[]> {
  const condominioId = getCondominioUUID();
  let query = supabase
    .from("fornecedores")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("nome");

  if (apenasAtivos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Fornecedor[];
}

export async function createFornecedor(payload: CreateFornecedorPayload): Promise<Fornecedor> {
  const condominioId = getCondominioUUID();
  const { data, error } = await supabase
    .from("fornecedores")
    .insert({
      condominio_id: condominioId,
      nome: payload.nome,
      cnpj: payload.cnpj ?? null,
      categoria: payload.categoria,
      telefone: payload.telefone ?? null,
      email: payload.email ?? null,
      notes: payload.notes ?? null,
      ativo: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Fornecedor;
}

export async function updateFornecedor(id: string, payload: Partial<CreateFornecedorPayload & { ativo: boolean }>): Promise<void> {
  const { error } = await supabase
    .from("fornecedores")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFornecedor(id: string): Promise<void> {
  const { error } = await supabase
    .from("fornecedores")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
