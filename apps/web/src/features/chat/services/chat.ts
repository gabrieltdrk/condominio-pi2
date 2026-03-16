import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_role: string;
};

type ChatRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name?: string | null;
    role?: string | null;
  } | null;
};

const STORAGE_KEY = "chat:messages:fallback";

function readFallbackMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function writeFallbackMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function mapRow(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    user_id: row.user_id,
    author_name: row.profiles?.name?.trim() || "Morador",
    author_role: row.profiles?.role ?? "MORADOR",
  };
}

export async function listChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, content, created_at, user_id, profiles!chat_messages_user_id_fkey(name, role)")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return readFallbackMessages();
  }

  return ((data ?? []) as ChatRow[]).map(mapRow);
}

export async function sendChatMessage(content: string): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const { error } = await supabase.from("chat_messages").insert({
    content: trimmed,
    user_id: user.id,
  });

  if (!error) return;

  const currentUser = getUser();
  const fallback = readFallbackMessages();
  fallback.push({
    id: `local-${Date.now()}`,
    content: trimmed,
    created_at: new Date().toISOString(),
    user_id: user.id,
    author_name: currentUser?.name ?? "Morador",
    author_role: currentUser?.role ?? "MORADOR",
  });
  writeFallbackMessages(fallback);
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);

  if (!error) return;

  writeFallbackMessages(readFallbackMessages().filter((message) => message.id !== messageId));
}

export function subscribeToChatMessages(onChange: () => void) {
  const channel = supabase
    .channel("chat-messages-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_messages" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
