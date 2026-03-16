import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sender_id: string | null;
  author_name: string;
  author_role: string;
};

type ChatRow = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  sender_id: string | null;
  profiles?: {
    name?: string | null;
    role?: string | null;
  } | null;
};

function mapRow(row: ChatRow): ChatMessage {
  return {
    id: String(row.id),
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sender_id: row.sender_id,
    author_name: row.profiles?.name?.trim() || "Morador",
    author_role: row.profiles?.role ?? "MORADOR",
  };
}

export async function listChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, created_at, updated_at, sender_id, profiles!messages_sender_id_fkey(name, role)")
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ChatRow[]).map(mapRow);
}

export async function sendChatMessage(content: string): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    content: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("messages").delete().eq("id", Number(messageId));

  if (error) {
    throw new Error(error.message);
  }
}

export function canDeleteMessage(message: ChatMessage) {
  const user = getUser();
  return !!user && user.email && message.sender_id !== null;
}

export function subscribeToChatMessages(onChange: () => void) {
  const channel = supabase
    .channel("messages-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
