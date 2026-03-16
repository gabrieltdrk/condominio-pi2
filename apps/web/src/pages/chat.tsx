import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleMore, SendHorizonal, Shield, Trash2, Users } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
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

export default function ChatPage() {
  const user = useMemo(() => getUser(), []);
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
      await sendChatMessage(draft);
      setDraft("");
      await loadMessages();
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
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(186,230,253,0.42),_transparent_34%),linear-gradient(135deg,_#ecfeff_0%,_#ffffff_48%,_#f8fafc_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                <MessageCircleMore size={13} />
                Conversa do condominio
              </div>
              <h2 className="mt-4 text-[clamp(1.7rem,3.8vw,2.9rem)] font-black leading-none tracking-[-0.05em] text-slate-950">
                Um chat simples para todo mundo falar no mesmo lugar.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Ideal para recados, alinhamentos rapidos e conversas do dia a dia entre moradores e administracao.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <MessageCircleMore size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Mensagens</span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{stats.total}</p>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Participando</span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{stats.authors}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="m-0 text-base font-semibold text-slate-900">Sala geral</h3>
              <p className="mt-1 text-sm text-slate-500">Mensagens em tempo real para todo o condominio.</p>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_18%)] px-4 py-4">
              {loading ? <p className="text-sm text-slate-400">Carregando mensagens...</p> : null}
              {!loading && messages.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">Ainda nao tem mensagem aqui</p>
                  <p className="mt-2 text-xs text-slate-500">Se quiser, pode mandar a primeira.</p>
                </div>
              ) : null}

              {messages.map((message) => (
                <article key={message.id} className="mr-auto max-w-[92%] rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
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

                    {message.sender_id === sessionUserId ? (
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
              ))}
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-4">
              {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}
              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Escreva uma mensagem para o chat geral"
                  className="min-h-[92px] flex-1 resize-none rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[160px]"
                >
                  <SendHorizonal size={16} />
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-base font-semibold text-slate-900">Como usar</h3>
              <div className="mt-4 space-y-3">
                {[
                  "Use para recados curtos, duvidas rapidas e comunicacao geral.",
                  "Evite dados sensiveis ou assuntos que precisam de atendimento privado.",
                  "Cada usuario pode excluir as proprias mensagens.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-base font-semibold text-slate-900">Seu status</h3>
              <div className="mt-4 rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                <p className="m-0 text-sm font-semibold text-slate-900">{user?.name ?? "Morador"}</p>
                <p className="mt-1 text-xs text-slate-500">{user?.role === "ADMIN" ? "Administrador" : "Morador"}</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppLayout>
  );
}
