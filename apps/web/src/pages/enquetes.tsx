import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, MessageSquare, PieChart, PlusCircle, SendHorizonal, Users } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";

type PollOption = {
  id: string;
  text: string;
  votes: string[];
};

type PollComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type Poll = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  options: PollOption[];
  comments: PollComment[];
};

const STORAGE_KEY = "omni:polls:v1";

const defaultPolls: Poll[] = [
  {
    id: "poll-1",
    title: "Troca do portão principal",
    description: "Você aprova priorizar a troca do motor do portão principal neste mês?",
    createdAt: new Date("2026-03-10T09:00:00").toISOString(),
    createdBy: "Síndico",
    options: [
      { id: "poll-1-option-1", text: "Sim, aprovo", votes: [] },
      { id: "poll-1-option-2", text: "Não, pode aguardar", votes: [] },
      { id: "poll-1-option-3", text: "Quero mais detalhes", votes: [] },
    ],
    comments: [
      {
        id: "poll-1-comment-1",
        author: "Equipe administrativa",
        message: "A troca preventiva reduz risco de falha nos horários de pico.",
        createdAt: new Date("2026-03-10T10:30:00").toISOString(),
      },
    ],
  },
  {
    id: "poll-2",
    title: "Novo espaço pet",
    description: "Qual opção faz mais sentido para o condomínio neste trimestre?",
    createdAt: new Date("2026-03-11T14:20:00").toISOString(),
    createdBy: "Conselho",
    options: [
      { id: "poll-2-option-1", text: "Criar espaço pet no térreo", votes: [] },
      { id: "poll-2-option-2", text: "Ampliar a área já existente", votes: [] },
      { id: "poll-2-option-3", text: "Adiar a decisão", votes: [] },
    ],
    comments: [],
  },
];

function readPolls(): Poll[] {
  if (typeof window === "undefined") return defaultPolls;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPolls;

  try {
    const parsed = JSON.parse(raw) as Poll[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultPolls;
  } catch {
    return defaultPolls;
  }
}

function savePolls(polls: Poll[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function EnquetesPage() {
  const user = getUser();
  const voterId = user?.email?.trim().toLowerCase() || "anonimo";
  const authorName = user?.name?.trim() || "Morador";

  const [polls, setPolls] = useState<Poll[]>(() => readPolls());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    savePolls(polls);
  }, [polls]);

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((sum, poll) => sum + poll.options.reduce((acc, option) => acc + option.votes.length, 0), 0);
    const totalComments = polls.reduce((sum, poll) => sum + poll.comments.length, 0);
    const participated = polls.filter((poll) => poll.options.some((option) => option.votes.includes(voterId))).length;

    return {
      totalPolls: polls.length,
      totalVotes,
      totalComments,
      participated,
    };
  }, [polls, voterId]);

  function handleCreatePoll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const options = [optionA, optionB, optionC]
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value, index) => ({
        id: buildId(`option-${index + 1}`),
        text: value,
        votes: [],
      }));

    if (!title.trim() || options.length < 2) {
      return;
    }

    const nextPoll: Poll = {
      id: buildId("poll"),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      createdBy: authorName,
      options,
      comments: [],
    };

    setPolls((current) => [nextPoll, ...current]);
    setTitle("");
    setDescription("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
  }

  function handleVote(pollId: string, optionId: string) {
    setPolls((current) =>
      current.map((poll) => {
        if (poll.id !== pollId) return poll;

        return {
          ...poll,
          options: poll.options.map((option) => {
            const filteredVotes = option.votes.filter((vote) => vote !== voterId);
            return option.id === optionId
              ? { ...option, votes: [...filteredVotes, voterId] }
              : { ...option, votes: filteredVotes };
          }),
        };
      }),
    );
  }

  function handleCommentSubmit(pollId: string) {
    const message = (commentDrafts[pollId] ?? "").trim();
    if (!message) return;

    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              comments: [
                ...poll.comments,
                {
                  id: buildId("comment"),
                  author: authorName,
                  message,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : poll,
      ),
    );

    setCommentDrafts((current) => ({ ...current, [pollId]: "" }));
  }

  return (
    <AppLayout title="Enquetes">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-[radial-gradient(circle_at_top_left,_rgba(199,210,254,0.42),_transparent_35%),linear-gradient(135deg,_#eef2ff_0%,_#ffffff_54%,_#f8fafc_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                <BarChart3 size={13} />
                Participação dos moradores
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Enquetes para decisões rápidas do condomínio</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Crie votações, acompanhe a adesão dos moradores e concentre comentários em um único lugar para decisões do dia a dia.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[640px]">
              {[
                { icon: PieChart, label: "Enquetes ativas", value: String(stats.totalPolls), hint: "Frontend por enquanto", tone: "bg-white border-indigo-100 text-indigo-700" },
                { icon: CheckCircle2, label: "Votos registrados", value: String(stats.totalVotes), hint: "Total acumulado", tone: "bg-white border-slate-100 text-slate-700" },
                { icon: MessageSquare, label: "Comentários", value: String(stats.totalComments), hint: "Discussões abertas", tone: "bg-white border-slate-100 text-slate-700" },
                { icon: Users, label: "Sua participação", value: `${stats.participated}`, hint: "Enquetes votadas", tone: "bg-white border-emerald-100 text-emerald-700" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-slate-400">{card.hint}</span>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleCreatePoll} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <PlusCircle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Criar enquete</h3>
                <p className="mt-0.5 text-xs text-slate-400">Monte uma votação rápida para os moradores.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Título</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Aprovação da pintura da fachada"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Descrição</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explique rapidamente o contexto da votação."
                  rows={4}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 resize-none"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Opção 1</span>
                  <input
                    value={optionA}
                    onChange={(event) => setOptionA(event.target.value)}
                    placeholder="Sim"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Opção 2</span>
                  <input
                    value={optionB}
                    onChange={(event) => setOptionB(event.target.value)}
                    placeholder="Não"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Opção 3</span>
                  <input
                    value={optionC}
                    onChange={(event) => setOptionC(event.target.value)}
                    placeholder="Opcional"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <PlusCircle size={16} />
                Publicar enquete
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Enquetes abertas</h3>
                <p className="mt-0.5 text-xs text-slate-400">Vote, acompanhe o resultado e participe dos comentários.</p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                {stats.totalPolls} ativas
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {polls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
                const selectedOptionId = poll.options.find((option) => option.votes.includes(voterId))?.id;

                return (
                  <article key={poll.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="m-0 text-base font-semibold text-slate-900">{poll.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{poll.description || "Sem descrição adicional."}</p>
                      </div>
                      <div className="text-right">
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Criada por {poll.createdBy}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{formatDate(poll.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {poll.options.map((option) => {
                        const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                        const isSelected = option.id === selectedOptionId;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleVote(poll.id, option.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-indigo-300 bg-indigo-50"
                                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-800">{option.text}</span>
                              <span className="text-xs font-semibold text-slate-500">
                                {option.votes.length} voto(s) • {percentage}%
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${isSelected ? "bg-indigo-500" : "bg-slate-300"}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="m-0 text-sm font-semibold text-slate-800">Comentários</p>
                        <span className="text-[11px] font-semibold text-slate-400">{poll.comments.length} comentário(s)</span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {poll.comments.length === 0 ? (
                          <p className="m-0 text-sm text-slate-400">Ainda não há comentários nesta enquete.</p>
                        ) : (
                          poll.comments.map((comment) => (
                            <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="m-0 text-sm font-semibold text-slate-800">{comment.author}</p>
                                <span className="text-[11px] text-slate-400">{formatDate(comment.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{comment.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-3 md:flex-row">
                        <input
                          value={commentDrafts[poll.id] ?? ""}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [poll.id]: event.target.value }))}
                          placeholder="Escreva um comentário sobre essa enquete"
                          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleCommentSubmit(poll.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <SendHorizonal size={16} />
                          Comentar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
