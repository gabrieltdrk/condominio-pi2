import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, MessageSquare, PieChart, PlusCircle, SendHorizonal, Sparkles, Vote, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import { addPollComment, createPoll, listPolls, subscribeToPolls, type Poll, voteOnPoll } from "../features/enquetes/services/enquetes";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPollTotalVotes(poll: Poll) {
  return poll.options.reduce((sum, option) => sum + option.votes.length, 0);
}

function getWinningOption(poll: Poll) {
  return [...poll.options].sort((left, right) => right.votes.length - left.votes.length)[0] ?? null;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-35px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="m-0 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

export default function EnquetesPage() {
  const user = getUser();
  const voterId = user?.id ?? user?.email?.trim().toLowerCase() ?? "anonimo";

  const [polls, setPolls] = useState<Poll[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextPolls = await listPolls();
        if (!active) return;
        setPolls(nextPolls);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar as enquetes.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const unsubscribe = subscribeToPolls(() => {
      void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((sum, poll) => sum + getPollTotalVotes(poll), 0);
    const totalComments = polls.reduce((sum, poll) => sum + poll.comments.length, 0);
    const participated = polls.filter((poll) => poll.options.some((option) => option.votes.includes(voterId))).length;

    return {
      totalPolls: polls.length,
      totalVotes,
      totalComments,
      participated,
    };
  }, [polls, voterId]);

  const selectedPoll = selectedPollId ? polls.find((poll) => poll.id === selectedPollId) ?? null : null;

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
  }

  async function handleCreatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    const options = [optionA, optionB, optionC].map((value) => value.trim()).filter(Boolean);
    if (!title.trim() || options.length < 2) return;

    try {
      setCreating(true);
      setError("");
      await createPoll({
        title,
        description,
        options,
      });
      resetCreateForm();
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a enquete.");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    try {
      setBusyPollId(pollId);
      setError("");
      await voteOnPoll(pollId, optionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar seu voto.");
    } finally {
      setBusyPollId(null);
    }
  }

  async function handleCommentSubmit(pollId: string) {
    const message = (commentDrafts[pollId] ?? "").trim();
    if (!message) return;

    try {
      setBusyPollId(pollId);
      setError("");
      await addPollComment(pollId, message);
      setCommentDrafts((current) => ({ ...current, [pollId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel comentar nesta enquete.");
    } finally {
      setBusyPollId(null);
    }
  }

  return (
    <AppLayout title="Enquetes">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles size={13} />
                Decisoes compartilhadas
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Enquetes do condominio</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Veja o panorama geral e abra cada enquete so quando precisar votar, acompanhar o resultado ou comentar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <PlusCircle size={16} />
              Nova enquete
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: PieChart, label: "Enquetes", value: String(stats.totalPolls), tone: "border-sky-100 bg-sky-50 text-sky-700" },
              { icon: Vote, label: "Votos", value: String(stats.totalVotes), tone: "border-slate-200 bg-slate-50 text-slate-700" },
              { icon: MessageSquare, label: "Comentarios", value: String(stats.totalComments), tone: "border-slate-200 bg-slate-50 text-slate-700" },
              { icon: CheckCircle2, label: "Sua participacao", value: String(stats.participated), tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 ${item.tone}`}>
                  <Icon size={15} />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Carregando enquetes...
            </div>
          ) : null}

          {!loading && polls.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Nenhuma enquete criada ainda.
            </div>
          ) : null}

          {polls.map((poll) => {
            const totalVotes = getPollTotalVotes(poll);
            const selectedOptionId = poll.options.find((option) => option.votes.includes(voterId))?.id;
            const selectedOption = poll.options.find((option) => option.id === selectedOptionId) ?? null;
            const winner = getWinningOption(poll);

            return (
              <article key={poll.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-base font-semibold text-slate-950">{poll.title}</h3>
                      {selectedOption ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          voce votou
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{poll.description || "Sem descricao adicional."}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {totalVotes} voto(s)
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {poll.comments.length} comentario(s)
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {poll.createdBy} • {formatDate(poll.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lider atual</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{winner?.text ?? "Sem definicao ainda"}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sua escolha</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedOption?.text ?? "Voce ainda nao votou"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {poll.options.map((option) => {
                      const isSelected = option.id === selectedOptionId;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleVote(poll.id, option.id)}
                          disabled={busyPollId === poll.id}
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? "border-sky-300 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedPollId(poll.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {createOpen ? (
        <ModalShell title="Nova enquete" subtitle="Crie a votacao em modal para manter a tela principal mais limpa." onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreatePoll} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Titulo</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Aprovacao da pintura da fachada"
                className={`mt-1 ${inputClass}`}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Descricao</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique rapidamente o contexto da votacao."
                rows={4}
                className={`mt-1 resize-none ${inputClass}`}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Opcao 1", value: optionA, setter: setOptionA, placeholder: "Sim" },
                { label: "Opcao 2", value: optionB, setter: setOptionB, placeholder: "Nao" },
                { label: "Opcao 3", value: optionC, setter: setOptionC, placeholder: "Opcional" },
              ].map((option) => (
                <label key={option.label} className="block">
                  <span className="text-xs font-semibold text-slate-600">{option.label}</span>
                  <input
                    value={option.value}
                    onChange={(event) => option.setter(event.target.value)}
                    placeholder={option.placeholder}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle size={16} />
                {creating ? "Publicando..." : "Publicar enquete"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedPoll ? (
        <ModalShell
          title={selectedPoll.title}
          subtitle={`Criada por ${selectedPoll.createdBy} em ${formatDate(selectedPoll.createdAt)}`}
          onClose={() => setSelectedPollId(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="m-0 text-sm leading-7 text-slate-700">{selectedPoll.description || "Sem descricao adicional."}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {getPollTotalVotes(selectedPoll)} voto(s)
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {selectedPoll.comments.length} comentario(s)
                </span>
              </div>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-500">
                <Vote size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Votacao</span>
              </div>

              <div className="mt-4 space-y-3">
                {selectedPoll.options.map((option) => {
                  const totalVotes = getPollTotalVotes(selectedPoll);
                  const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                  const isSelected = option.votes.includes(voterId);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleVote(selectedPoll.id, option.id)}
                      disabled={busyPollId === selectedPoll.id}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/70"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-800">{option.text}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {option.votes.length} voto(s) • {percentage}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div className={`h-full rounded-full ${isSelected ? "bg-sky-500" : "bg-slate-300"}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock3 size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Comentarios</span>
                </div>
                <span className="text-xs text-slate-400">{selectedPoll.comments.length} registro(s)</span>
              </div>

              <div className="mt-4 space-y-3">
                {selectedPoll.comments.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Ainda nao ha comentarios nesta enquete.
                  </div>
                ) : (
                  selectedPoll.comments.map((comment) => (
                    <div key={comment.id} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="m-0 text-sm font-semibold text-slate-900">{comment.author}</p>
                        <span className="text-[11px] text-slate-400">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  value={commentDrafts[selectedPoll.id] ?? ""}
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [selectedPoll.id]: event.target.value }))}
                  placeholder="Escreva um comentario sobre essa enquete"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => handleCommentSubmit(selectedPoll.id)}
                  disabled={busyPollId === selectedPoll.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizonal size={16} />
                  Comentar
                </button>
              </div>
            </section>
          </div>
        </ModalShell>
      ) : null}
    </AppLayout>
  );
}
