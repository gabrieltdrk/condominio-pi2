import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleMore, SendHorizonal, Shield, ShoppingBag, Trash2, Users, Wrench } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import {
  deleteChatMessage,
  listChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from "../features/chat/services/chat";

type ChatTopic = {
  id: string;
  label: string;
  description: string;
  icon: typeof MessageCircleMore;
  accent: string;
};

const CHAT_TOPICS: ChatTopic[] = [
  { id: "GERAL", label: "Geral", description: "Conversa aberta do condominio", icon: MessageCircleMore, accent: "bg-sky-100 text-sky-700" },
  { id: "AVISOS", label: "Avisos", description: "Recados e comunicados rapidos", icon: Shield, accent: "bg-indigo-100 text-indigo-700" },
  { id: "MANUTENCAO", label: "Manutencao", description: "Problemas, reparos e acompanhamento", icon: Wrench, accent: "bg-amber-100 text-amber-700" },
  { id: "PORTARIA", label: "Portaria", description: "Visitantes, entregas e acesso", icon: Users, accent: "bg-emerald-100 text-emerald-700" },
  { id: "COMPRA_VENDA", label: "Compra e venda", description: "Trocas e ofertas entre moradores", icon: ShoppingBag, accent: "bg-rose-100 text-rose-700" },
];

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
  const isAdmin = user?.role === "ADMIN";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("GERAL");
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

  const filteredMessages = useMemo(
    () => messages.filter((message) => message.topic === selectedTopic),
    [messages, selectedTopic],
  );

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredMessages]);

  const stats = useMemo(() => {
    const uniqueAuthors = new Set(messages.map((message) => message.user_id)).size;
    return { total: messages.length, authors: uniqueAuthors };
  }, [messages]);

  const topicStats = useMemo(
    () =>
      CHAT_TOPICS.map((topic) => ({
        ...topic,
        count: messages.filter((message) => message.topic === topic.id).length,
      })),
    [messages],
  );

  const currentTopic = topicStats.find((topic) => topic.id === selectedTopic) ?? topicStats[0];

  async function handleSend() {
    if (!draft.trim()) return;

    setSending(true);
    setError("");
    try {
      await sendChatMessage(draft, selectedTopic);
      setDraft("");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message: ChatMessage) {
    if (!isAdmin) return;
    if (!window.confirm("Excluir esta mensagem do chat?")) return;

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
                Conversas por topico
              </div>
              <h2 className="mt-4 text-[clamp(1.9rem,4vw,3.1rem)] font-black leading-none tracking-[-0.05em] text-slate-950">
                Tópicos na esquerda, conversa na direita.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                O chat ficou mais organizado para evitar rolagem infinita e separar melhor os assuntos do condominio.
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

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="px-1 text-base font-semibold text-slate-900">Tópicos</h3>
              <div className="mt-4 space-y-2">
                {topicStats.map((topic) => {
                  const Icon = topic.icon;
                  const active = selectedTopic === topic.id;

                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        active ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? "bg-white/10 text-white" : topic.accent}`}>
                              <Icon size={17} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{topic.label}</p>
                              <p className={`mt-0.5 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>{topic.description}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {topic.count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-base font-semibold text-slate-900">Como usar</h3>
              <div className="mt-4 space-y-3">
                {[
                  "Escolha um topico na esquerda antes de mandar a mensagem.",
                  "Use o topico certo para nao misturar conversa de assuntos diferentes.",
                  "Se necessario, o admin pode remover mensagens inadequadas.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <div className="flex min-h-[680px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-base font-semibold text-slate-900">{currentTopic.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">{currentTopic.description}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {filteredMessages.length} mensagem(ns)
                </span>
              </div>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_18%)] px-4 py-4">
              {loading ? <p className="text-sm text-slate-400">Carregando mensagens...</p> : null}
              {!loading && filteredMessages.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">Ainda nao tem mensagem neste tópico</p>
                  <p className="mt-2 text-xs text-slate-500">Se quiser, pode abrir a conversa por aqui.</p>
                </div>
              ) : null}

              {filteredMessages.map((message) => (
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

                    {isAdmin ? (
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
              <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Enviando para: <span className="font-semibold text-slate-700">{currentTopic.label}</span>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={`Escreva uma mensagem em ${currentTopic.label.toLowerCase()}`}
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
        </section>
      </div>
    </AppLayout>
  );
}
