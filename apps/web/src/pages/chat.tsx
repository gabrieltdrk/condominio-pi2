import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleMore, SendHorizonal, Shield, Trash2 } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { supabase } from "../lib/supabase";
import {
  deleteChatMessage,
  listChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from "../features/chat/services/chat";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeMessages(nextMessages: ChatMessage[]) {
  const uniqueMessages = new Map<string, ChatMessage>();

  nextMessages.forEach((message) => {
    uniqueMessages.set(message.id, message);
  });

  return Array.from(uniqueMessages.values()).sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

export default function ChatPage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      const data = await listChatMessages();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
    const unsubscribe = subscribeToChatMessages(() => {
      void loadMessages();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadSessionUser() {
      const { data } = await supabase.auth.getUser();
      setSessionUserId(data.user?.id ?? null);
    }

    void loadSessionUser();
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const stats = useMemo(() => {
    const uniqueAuthors = new Set(messages.map((message) => message.sender_id ?? message.author_name)).size;
    return {
      total: messages.length,
      authors: uniqueAuthors,
    };
  }, [messages]);

  async function handleSend() {
    if (!draft.trim()) return;

    setSending(true);
    setError("");
    try {
      const sentMessage = await sendChatMessage(draft);
      setMessages((currentMessages) => mergeMessages([...currentMessages, sentMessage]));
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message: ChatMessage) {
    if (message.sender_id !== sessionUserId) {
      return;
    }

    if (!window.confirm("Excluir esta mensagem do chat?")) {
      return;
    }

    try {
      await deleteChatMessage(message.id);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a mensagem.");
    }
  }

  return (
    <AppLayout title="Chat Geral">
      <div className="mx-auto flex h-[calc(100vh-9rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <MessageCircleMore size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Chat geral</h2>
                <p className="text-xs text-slate-500">Conversa em tempo real do condominio.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {stats.total} mensagens
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {stats.authors} pessoas
            </span>
          </div>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_18%)] px-4 py-4 md:px-5"
        >
          {loading ? <p className="text-sm text-slate-400">Carregando mensagens...</p> : null}
          {!loading && messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-md rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Ainda nao tem mensagem aqui</p>
              <p className="mt-2 text-xs text-slate-500">Se quiser, pode mandar a primeira.</p>
            </div>
          ) : null}

          {messages.map((message) => {
            const isOwn = message.sender_id === sessionUserId;

            return (
              <article
                key={message.id}
                className={`max-w-[88%] rounded-[24px] border px-4 py-3 shadow-sm ${
                  isOwn ? "ml-auto border-sky-200 bg-sky-50" : "mr-auto border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 text-sm font-semibold text-slate-900">{message.author_name}</p>
                      {message.author_role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          <Shield size={11} />
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{formatTime(message.created_at)}</p>
                  </div>

                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(message)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                      title="Excluir mensagem"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.content}</p>
              </article>
            );
          })}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 md:px-5">
          {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                if (sending || !draft.trim()) return;
                void handleSend();
              }}
              rows={1}
              maxLength={500}
              placeholder="Digite sua mensagem..."
              className="max-h-36 min-h-[52px] flex-1 resize-none rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="inline-flex h-[52px] min-w-[120px] items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizonal size={16} />
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
