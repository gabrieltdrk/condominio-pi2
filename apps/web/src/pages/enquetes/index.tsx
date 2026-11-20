import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  PlusCircle,
  Users,
  Vote,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import {
  addPollComment,
  createPoll,
  listPollSignatures,
  listPolls,
  subscribeToPolls,
  updatePollStatus,
  voteOnPoll,
  type Poll,
  type PollSignatureLog,
} from "../../features/enquetes/services/enquetes";
import { getPollTotalVotes } from "./utils/poll-calc";
import { buildMinutesDocument } from "./utils/minutes-builder";
import { PollCard } from "./components/poll-card";
import { PollFormModal, emptyCreatePollDraft, type CreatePollDraft } from "./components/poll-form-modal";
import { VoteSignatureModal } from "./components/vote-signature-modal";
import { PollDetailModal } from "./components/poll-detail-modal";

export default function EnquetesPage() {
  const user = getUser();
  const voterId = String(user?.id ?? user?.email?.trim().toLowerCase() ?? "anonimo");
  const canManage = user?.role === "ADMIN";

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreatePollDraft>(emptyCreatePollDraft());
  const [creating, setCreating] = useState(false);

  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [minutesDraft, setMinutesDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [signatureLogs, setSignatureLogs] = useState<PollSignatureLog[]>([]);
  const [loadingSignatureLogs, setLoadingSignatureLogs] = useState(false);

  const [voteSignatureOpen, setVoteSignatureOpen] = useState(false);
  const [voteSignatureDataUrl, setVoteSignatureDataUrl] = useState("");
  const [pendingVote, setPendingVote] = useState<{ pollId: string; optionId: string } | null>(null);

  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextPolls = await listPolls();
      setPolls(nextPolls);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar as assembleias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => { if (!active) return; await load(); })();
    const unsubscribe = subscribeToPolls(() => { if (!active) return; void load(); });
    return () => { active = false; unsubscribe(); };
  }, [load]);

  const selectedPoll = selectedPollId ? polls.find((p) => p.id === selectedPollId) ?? null : null;

  useEffect(() => { setMinutesDraft(selectedPoll?.minutesSummary ?? ""); }, [selectedPoll?.id, selectedPoll?.minutesSummary]);

  useEffect(() => {
    let active = true;
    if (!selectedPoll?.id) { setSignatureLogs([]); return () => { active = false; }; }
    setLoadingSignatureLogs(true);
    void listPollSignatures(selectedPoll.id)
      .then((logs) => { if (active) setSignatureLogs(logs); })
      .catch(() => { if (active) setSignatureLogs([]); })
      .finally(() => { if (active) setLoadingSignatureLogs(false); });
    return () => { active = false; };
  }, [selectedPoll?.id]);

  const stats = useMemo(() => ({
    totalAssemblies: polls.length,
    totalVotes: polls.reduce((sum, p) => sum + getPollTotalVotes(p), 0),
    totalComments: polls.reduce((sum, p) => sum + p.comments.length, 0),
    openAssemblies: polls.filter((p) => p.status === "OPEN").length,
    participated: polls.filter((p) => p.options.some((o) => o.votes.includes(voterId))).length,
  }), [polls, voterId]);

  async function handleCreatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const options = [createDraft.optionA, createDraft.optionB, createDraft.optionC].map((v) => v.trim()).filter(Boolean);
    const missing: string[] = [];
    if (!createDraft.title.trim()) missing.push("Título");
    if (!createDraft.description.trim()) missing.push("Descrição");
    if (options.length < 2) missing.push("Pelo menos 2 opções");
    if (!createDraft.votingStartsAt) missing.push("Início da votação");
    if (!createDraft.votingEndsAt) missing.push("Fim da votação");
    if (missing.length > 0) { setError(`Preencha: ${missing.join(", ")}.`); return; }

    let signatureUpload: File | null = createDraft.signatureFile;
    if (!signatureUpload && createDraft.signatureDataUrl) {
      const blob = await (await fetch(createDraft.signatureDataUrl)).blob();
      signatureUpload = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
    }

    try {
      setCreating(true);
      setError("");
      setInfo("");
      await createPoll({
        title: createDraft.title,
        description: createDraft.description,
        options,
        assemblyType: createDraft.assemblyType,
        meetingMode: createDraft.meetingMode,
        scope: createDraft.scope,
        status: createDraft.status,
        meetingAt: createDraft.meetingAt ? new Date(createDraft.meetingAt).toISOString() : null,
        votingStartsAt: createDraft.votingStartsAt ? new Date(createDraft.votingStartsAt).toISOString() : new Date().toISOString(),
        votingEndsAt: createDraft.votingEndsAt ? new Date(createDraft.votingEndsAt).toISOString() : null,
        quorumMinPercent: Number(createDraft.quorumMinPercent),
        approvalMinPercent: Number(createDraft.approvalMinPercent),
        allowComments: createDraft.allowComments,
        attachmentFile: createDraft.attachmentFile,
        signatureFile: signatureUpload,
      });
      setCreateDraft(emptyCreatePollDraft());
      setCreateOpen(false);
      setInfo("Assembleia criada com sucesso.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a assembleia.");
    } finally {
      setCreating(false);
    }
  }

  function handleVote(pollId: string, optionId: string) {
    setPendingVote({ pollId, optionId });
    setVoteSignatureDataUrl("");
    setVoteSignatureOpen(true);
    setError("Assinatura obrigatoria para registrar o voto.");
  }

  async function confirmPendingVote() {
    if (!pendingVote || !voteSignatureDataUrl) { setError("Assine para confirmar seu voto."); return; }
    try {
      setBusyPollId(pendingVote.pollId);
      setSigning(true);
      setError("");
      setInfo("");
      const signatureBlob = await (await fetch(voteSignatureDataUrl)).blob();
      const signatureFile = new File([signatureBlob], `vote-signature-${Date.now()}.png`, { type: "image/png" });
      await voteOnPoll(pendingVote.pollId, pendingVote.optionId, signatureFile);
      setPolls((current) =>
        current.map((poll) =>
          poll.id !== pendingVote.pollId ? poll : {
            ...poll,
            options: poll.options.map((opt) =>
              opt.id === pendingVote.optionId
                ? { ...opt, votes: Array.from(new Set([...opt.votes, voterId])) }
                : { ...opt, votes: opt.votes.filter((v) => v !== voterId) },
            ),
          },
        ),
      );
      setInfo("Voto registrado.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar seu voto.");
    } finally {
      setSigning(false);
      setBusyPollId(null);
      setPendingVote(null);
      setVoteSignatureOpen(false);
      setVoteSignatureDataUrl("");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel comentar nesta assembleia.");
    } finally {
      setBusyPollId(null);
    }
  }

  async function handleCloseAssembly(pollId: string) {
    try {
      setBusyPollId(pollId);
      setError("");
      await updatePollStatus(pollId, "CLOSED", minutesDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel encerrar a assembleia.");
    } finally {
      setBusyPollId(null);
    }
  }

  function handlePrintMinutes(poll: Poll) {
    const printWindow = window.open("", "_blank", "width=980,height=760");
    if (!printWindow) { setError("Nao foi possivel abrir a janela de impressao."); return; }
    const documentContent = buildMinutesDocument({
      ...poll,
      minutesSummary: poll.id === selectedPollId ? minutesDraft : poll.minutesSummary,
      creatorSignatureUrl: poll.creatorSignatureUrl || createDraft.signatureDataUrl || null,
      creatorSignatureName: poll.creatorSignatureName || user?.name || poll.createdBy,
    });
    printWindow.document.open();
    printWindow.document.write(documentContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <AppLayout title="Assembleia Digital">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(248,250,252,0))]" />

        <section className="rounded-[28px] border border-slate-100 bg-linear-to-br from-sky-50 via-white to-emerald-50 px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-700">
                  <Vote size={10} />
                  Assembleia Digital
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Deliberações do condomínio</h1>
              <p className="mt-0.5 text-sm text-slate-500">Participe das votações e acompanhe as decisões coletivas.</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                <PlusCircle size={15} />
                Nova assembleia
              </button>
            )}
          </div>
        </section>
        {info && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{info}</p>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              icon: FileText,
              label: "Assembleias",
              value: String(stats.totalAssemblies),
              sub: "Convocacoes registradas",
              cardTone: "border-sky-200 bg-[linear-gradient(180deg,_#f7fbff,_#eaf5ff)]",
              iconTone: "text-sky-700",
            },
            {
              icon: Vote,
              label: "Votos recebidos",
              value: String(stats.totalVotes),
              sub: "Manifestacoes computadas",
              cardTone: "border-amber-200 bg-[linear-gradient(180deg,_#fffaf0,_#fff4dd)]",
              iconTone: "text-amber-700",
            },
            {
              icon: Users,
              label: "Assembleias abertas",
              value: String(stats.openAssemblies),
              sub: "Em fase de votacao",
              cardTone: "border-emerald-200 bg-[linear-gradient(180deg,_#f7fffb,_#eefcf5)]",
              iconTone: "text-emerald-700",
            },
            {
              icon: CheckCircle2,
              label: "Sua participacao",
              value: String(stats.participated),
              sub: "Assembleias com seu voto",
              cardTone: "border-slate-200 bg-[linear-gradient(180deg,_#fbfcfe,_#f1f5f9)]",
              iconTone: "text-slate-700",
            },
            {
              icon: MessageSquare,
              label: "Comentarios",
              value: String(stats.totalComments),
              sub: "Manifestacoes registradas",
              cardTone: "border-rose-200 bg-[linear-gradient(180deg,_#fff7f8,_#ffecef)]",
              iconTone: "text-rose-700",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-[30px] border p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] ${card.cardTone}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] ${card.iconTone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-[2rem] font-black leading-none tracking-[-0.05em] text-slate-900">{card.value}</p>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-700">{card.label}</p>
                <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
              </div>
            );
          })}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Assembleias {!loading && polls.length > 0 ? `· ${polls.length}` : ""}
            </h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
                Carregando assembleias...
              </div>
            ) : null}
            {!loading && polls.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
                Nenhuma assembleia criada ainda.
              </div>
            ) : null}
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                voterId={voterId}
                busyPollId={busyPollId}
                signing={signing}
                onVote={handleVote}
                onViewDetails={setSelectedPollId}
              />
            ))}
          </div>
        </section>
      </div>

      <PollFormModal
        open={createOpen}
        draft={createDraft}
        setDraft={setCreateDraft}
        creating={creating}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreatePoll}
      />

      <VoteSignatureModal
        open={voteSignatureOpen}
        signatureDataUrl={voteSignatureDataUrl}
        onSignatureChange={setVoteSignatureDataUrl}
        signing={signing}
        onCancel={() => { setVoteSignatureOpen(false); setPendingVote(null); }}
        onConfirm={() => void confirmPendingVote()}
      />

      <PollDetailModal
        poll={selectedPoll}
        voterId={voterId}
        canManage={canManage}
        busyPollId={busyPollId}
        signing={signing}
        signatureLogs={signatureLogs}
        loadingSignatureLogs={loadingSignatureLogs}
        minutesDraft={minutesDraft}
        onMinutesDraftChange={setMinutesDraft}
        commentDrafts={commentDrafts}
        onCommentDraftChange={(pollId, value) => setCommentDrafts((c) => ({ ...c, [pollId]: value }))}
        onVote={handleVote}
        onCommentSubmit={handleCommentSubmit}
        onCloseAssembly={handleCloseAssembly}
        onPrintMinutes={handlePrintMinutes}
        onClose={() => setSelectedPollId(null)}
      />
    </AppLayout>
  );
}
