import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Printer,
  MessageSquare,
  PlusCircle,
  SendHorizonal,
  Sparkles,
  Users,
  Vote,
  X,
} from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import {
  addPollComment,
  createPoll,
  listPolls,
  subscribeToPolls,
  updatePollStatus,
  voteOnPoll,
  type AssemblyMode,
  type AssemblyScope,
  type AssemblyStatus,
  type AssemblyType,
  type Poll,
} from "../features/enquetes/services/enquetes";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

function formatDate(iso: string | null) {
  if (!iso) return "-";
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

function getStatusMeta(status: AssemblyStatus) {
  switch (status) {
    case "DRAFT":
      return { label: "Rascunho", className: "border-slate-200 bg-slate-100 text-slate-700" };
    case "CLOSED":
      return { label: "Encerrada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    default:
      return { label: "Aberta", className: "border-sky-200 bg-sky-50 text-sky-700" };
  }
}

function getAssemblyTypeLabel(value: AssemblyType) {
  return value === "EXTRAORDINARIA" ? "Extraordinaria" : "Ordinaria";
}

function getModeLabel(value: AssemblyMode) {
  if (value === "HIBRIDA") return "Hibrida";
  if (value === "PRESENCIAL") return "Presencial";
  return "Digital";
}

function getScopeLabel(value: AssemblyScope) {
  if (value === "ADMINISTRATIVO") return "Administrativo";
  if (value === "EMERGENCIAL") return "Emergencial";
  return "Geral";
}

function formatDateDocument(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildMinutesDocument(poll: Poll) {
  const totalVotes = getPollTotalVotes(poll);
  const winner = getWinningOption(poll);
  const resultItems = poll.options
    .map((option) => {
      const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
      return `<li><strong>${escapeHtml(option.text)}</strong>: ${option.votes.length} voto(s) (${percentage}%)</li>`;
    })
    .join("");

  const commentItems =
    poll.comments.length > 0
      ? poll.comments
          .map(
            (comment) =>
              `<li><strong>${escapeHtml(comment.author)}</strong> (${formatDateDocument(comment.createdAt)}): ${escapeHtml(comment.message)}</li>`,
          )
          .join("")
      : "<li>Sem manifestacoes registradas.</li>";

  const minutesSummary = poll.minutesSummary.trim()
    ? escapeHtml(poll.minutesSummary).replaceAll("\n", "<br />")
    : "Ata resumida ainda nao informada.";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Ata da Assembleia - ${escapeHtml(poll.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.6; }
      h1, h2, h3, p { margin: 0 0 12px; }
      h1 { font-size: 24px; }
      h2 { margin-top: 24px; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 20px 0; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; background: #f8fafc; }
      .muted { color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      ul { padding-left: 20px; }
      .footer { margin-top: 40px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
      .signature { padding-top: 28px; border-top: 1px solid #94a3b8; }
      @media print { body { margin: 18px; } }
    </style>
  </head>
  <body>
    <h1>Ata de Assembleia Digital</h1>
    <p><strong>Pauta:</strong> ${escapeHtml(poll.title)}</p>
    <p><strong>Descricao:</strong> ${escapeHtml(poll.description || "Sem descricao adicional.")}</p>

    ${
      poll.attachmentUrl
        ? `<p><strong>Anexo da pauta:</strong> <a href="${poll.attachmentUrl}" target="_blank" rel="noreferrer">${escapeHtml(
            poll.attachmentName ?? "Documento",
          )}</a></p>`
        : ""
    }

    <div class="meta">
      <div class="card"><div class="muted">Tipo</div><div>${escapeHtml(getAssemblyTypeLabel(poll.assemblyType))}</div></div>
      <div class="card"><div class="muted">Modalidade</div><div>${escapeHtml(getModeLabel(poll.meetingMode))}</div></div>
      <div class="card"><div class="muted">Escopo</div><div>${escapeHtml(getScopeLabel(poll.scope))}</div></div>
      <div class="card"><div class="muted">Status</div><div>${escapeHtml(getStatusMeta(poll.status).label)}</div></div>
      <div class="card"><div class="muted">Convocada por</div><div>${escapeHtml(poll.createdBy)}</div></div>
      <div class="card"><div class="muted">Criada em</div><div>${formatDateDocument(poll.createdAt)}</div></div>
      <div class="card"><div class="muted">Janela de votacao</div><div>${formatDateDocument(poll.votingStartsAt)} ate ${formatDateDocument(poll.votingEndsAt)}</div></div>
      <div class="card"><div class="muted">Data da reuniao</div><div>${formatDateDocument(poll.meetingAt)}</div></div>
      <div class="card"><div class="muted">Quorum minimo</div><div>${poll.quorumMinPercent}%</div></div>
      <div class="card"><div class="muted">Aprovacao minima</div><div>${poll.approvalMinPercent}%</div></div>
    </div>

    <h2>Resultado da Deliberacao</h2>
    <p><strong>Total de votos:</strong> ${totalVotes}</p>
    <p><strong>Opcao lider:</strong> ${escapeHtml(winner?.text ?? "Sem definicao")}</p>
    <ul>${resultItems}</ul>

    <h2>Manifestacoes Registradas</h2>
    <ul>${commentItems}</ul>

    <h2>Ata Resumida</h2>
    <p>${minutesSummary}</p>

    <div class="footer">
      <div class="signature">
        Responsavel pela assembleia
        ${
          poll.creatorSignatureUrl
            ? `<div style="margin-top:12px;"><img src="${poll.creatorSignatureUrl}" alt="Assinatura" style="max-height:80px;"></div>`
            : ""
        }
        <div style="margin-top:6px; color:#475569; font-size:12px;">${escapeHtml(poll.creatorSignatureName ?? poll.createdBy)}</div>
      </div>
      <div class="signature">Representacao do condominio</div>
    </div>
  </body>
</html>`;
}

function SignaturePad({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const scaleRef = useRef(1);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!value || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
    };
    img.src = value;
  }, [value, canvasEl]);

  useEffect(() => {
    if (!canvasEl || initializedRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    scaleRef.current = dpr;
    const logicalWidth = canvasEl.getBoundingClientRect().width || 600;
    canvasEl.width = logicalWidth * dpr;
    canvasEl.height = 200 * dpr;
    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    initializedRef.current = true;
  }, [canvasEl]);

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvasEl.getBoundingClientRect();
    const scale = scaleRef.current;
    ctx.moveTo((event.clientX - rect.left) * scale, (event.clientY - rect.top) * scale);
    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const rect = canvasEl.getBoundingClientRect();
    const scale = scaleRef.current;
    ctx.lineTo((event.clientX - rect.left) * scale, (event.clientY - rect.top) * scale);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing || !canvasEl) return;
    setIsDrawing(false);
    onChange(canvasEl.toDataURL("image/png"));
  }

  function clearCanvas() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    onChange("");
  }

  return (
    <div className="mt-2">
      <canvas
        ref={setCanvasEl}
        width={600}
        height={200}
        className="w-full rounded-2xl border border-slate-300 bg-white"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div className="mt-2 flex items-center gap-2">
        <p className="text-[11px] text-slate-500 flex-1">Assine com mouse ou toque. A imagem é salva como PNG para a ata.</p>
        <button type="button" onClick={clearCanvas} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          Limpar assinatura
        </button>
      </div>
    </div>
  );
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
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-35px_rgba(15,23,42,0.45)]">
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
  const canManage = user?.role === "ADMIN";

  const [polls, setPolls] = useState<Poll[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [minutesDraft, setMinutesDraft] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [assemblyType, setAssemblyType] = useState<AssemblyType>("ORDINARIA");
  const [meetingMode, setMeetingMode] = useState<AssemblyMode>("DIGITAL");
  const [scope, setScope] = useState<AssemblyScope>("GERAL");
  const [status, setStatus] = useState<AssemblyStatus>("OPEN");
  const [meetingAt, setMeetingAt] = useState("");
  const [votingStartsAt, setVotingStartsAt] = useState("");
  const [votingEndsAt, setVotingEndsAt] = useState("");
  const [quorumMinPercent, setQuorumMinPercent] = useState("50");
  const [approvalMinPercent, setApprovalMinPercent] = useState("50");
  const [allowComments, setAllowComments] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar as assembleias.");
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
    const openAssemblies = polls.filter((poll) => poll.status === "OPEN").length;
    const participated = polls.filter((poll) => poll.options.some((option) => option.votes.includes(voterId))).length;

    return {
      totalAssemblies: polls.length,
      totalVotes,
      totalComments,
      openAssemblies,
      participated,
    };
  }, [polls, voterId]);

  const selectedPoll = selectedPollId ? polls.find((poll) => poll.id === selectedPollId) ?? null : null;

  useEffect(() => {
    setMinutesDraft(selectedPoll?.minutesSummary ?? "");
  }, [selectedPoll?.id, selectedPoll?.minutesSummary]);

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setAssemblyType("ORDINARIA");
    setMeetingMode("DIGITAL");
    setScope("GERAL");
    setStatus("OPEN");
    setMeetingAt("");
    setVotingStartsAt("");
    setVotingEndsAt("");
    setQuorumMinPercent("50");
    setApprovalMinPercent("50");
    setAllowComments(true);
    setAttachmentFile(null);
    setSignatureFile(null);
    setSignatureDataUrl("");
    setError("");
    setInfo("");
  }

  async function handleCreatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    const options = [optionA, optionB, optionC].map((value) => value.trim()).filter(Boolean);
    const missing: string[] = [];
    if (!title.trim()) missing.push("Título");
    if (!description.trim()) missing.push("Descrição");
    if (options.length < 2) missing.push("Pelo menos 2 opções");
    if (!votingStartsAt) missing.push("Início da votação");
    if (!votingEndsAt) missing.push("Fim da votação");
    if (missing.length > 0) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    let signatureUpload: File | null = signatureFile;
    if (!signatureUpload && signatureDataUrl) {
      const blob = await (await fetch(signatureDataUrl)).blob();
      signatureUpload = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
    }

    try {
      setCreating(true);
      setError("");
      setInfo("");
      await createPoll({
        title,
        description,
        options,
        assemblyType,
        meetingMode,
        scope,
        status,
        meetingAt: meetingAt ? new Date(meetingAt).toISOString() : null,
        votingStartsAt: votingStartsAt ? new Date(votingStartsAt).toISOString() : new Date().toISOString(),
        votingEndsAt: votingEndsAt ? new Date(votingEndsAt).toISOString() : null,
        quorumMinPercent: Number(quorumMinPercent),
        approvalMinPercent: Number(approvalMinPercent),
        allowComments,
        attachmentFile,
        signatureFile: signatureUpload,
      });
      resetCreateForm();
      setCreateOpen(false);
      setInfo("Assembleia criada com sucesso.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a assembleia.");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    try {
      setBusyPollId(pollId);
      setError("");
      setInfo("");
      await voteOnPoll(pollId, optionId);
      setPolls((current) =>
        current.map((poll) =>
          poll.id !== pollId
            ? poll
            : {
                ...poll,
                options: poll.options.map((opt) =>
                  opt.id === optionId
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
    if (!printWindow) {
      setError("Nao foi possivel abrir a janela de impressao.");
      return;
    }

    const documentContent = buildMinutesDocument({
      ...poll,
      minutesSummary: poll.id === selectedPollId ? minutesDraft : poll.minutesSummary,
      creatorSignatureUrl: poll.creatorSignatureUrl || signatureDataUrl || null,
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
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles size={13} />
                Deliberacoes do condominio
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Assembleia digital</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use esta area para convocar assembleias, abrir a janela de votacao, colher manifestacoes dos moradores e encerrar com uma ata resumida.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <PlusCircle size={16} />
                Nova assembleia
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: FileText, label: "Assembleias", value: String(stats.totalAssemblies), tone: "border-sky-100 bg-sky-50 text-sky-700" },
              { icon: Vote, label: "Votos", value: String(stats.totalVotes), tone: "border-slate-200 bg-slate-50 text-slate-700" },
              { icon: Users, label: "Abertas", value: String(stats.openAssemblies), tone: "border-amber-100 bg-amber-50 text-amber-700" },
              { icon: CheckCircle2, label: "Sua participacao", value: String(stats.participated), tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
              { icon: MessageSquare, label: "Comentarios", value: String(stats.totalComments), tone: "border-slate-200 bg-slate-50 text-slate-700" },
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

        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
        {info && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{info}</p>}

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Carregando assembleias...
            </div>
          ) : null}

          {!loading && polls.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Nenhuma assembleia criada ainda.
            </div>
          ) : null}

          {polls.map((poll) => {
            const totalVotes = getPollTotalVotes(poll);
            const selectedOptionId = poll.options.find((option) => option.votes.includes(voterId))?.id;
            const selectedOption = poll.options.find((option) => option.id === selectedOptionId) ?? null;
            const winner = getWinningOption(poll);
            const statusMeta = getStatusMeta(poll.status);

            return (
              <article key={poll.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-base font-semibold text-slate-950">{poll.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      {selectedOption ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          voce votou
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{poll.description || "Sem descricao adicional."}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getAssemblyTypeLabel(poll.assemblyType)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getModeLabel(poll.meetingMode)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getScopeLabel(poll.scope)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Quorum {poll.quorumMinPercent}%</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Aprovacao {poll.approvalMinPercent}%</span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Janela de votacao</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(poll.votingStartsAt)} ate {formatDate(poll.votingEndsAt)}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lider atual</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{winner?.text ?? "Sem definicao ainda"}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sua escolha</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedOption?.text ?? "Voce ainda nao votou"}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Participacao</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{totalVotes} voto(s) e {poll.comments.length} comentario(s)</p>
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
                          disabled={busyPollId === poll.id || poll.status !== "OPEN"}
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
        <ModalShell title="Nova assembleia" subtitle="Configure a convocacao, pauta e regras de votacao." onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreatePoll} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Titulo da pauta</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Aprovacao da pintura da fachada" className={`mt-1 ${inputClass}`} />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Descricao</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explique a pauta, impactos e orientacoes para os moradores." rows={4} className={`mt-1 resize-none ${inputClass}`} />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Tipo</span>
                <select value={assemblyType} onChange={(event) => setAssemblyType(event.target.value as AssemblyType)} className={`mt-1 ${inputClass}`}>
                  <option value="ORDINARIA">Ordinaria</option>
                  <option value="EXTRAORDINARIA">Extraordinaria</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Modalidade</span>
                <select value={meetingMode} onChange={(event) => setMeetingMode(event.target.value as AssemblyMode)} className={`mt-1 ${inputClass}`}>
                  <option value="DIGITAL">Digital</option>
                  <option value="HIBRIDA">Hibrida</option>
                  <option value="PRESENCIAL">Presencial</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Escopo</span>
                <select value={scope} onChange={(event) => setScope(event.target.value as AssemblyScope)} className={`mt-1 ${inputClass}`}>
                  <option value="GERAL">Geral</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="EMERGENCIAL">Emergencial</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Status inicial</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as AssemblyStatus)} className={`mt-1 ${inputClass}`}>
                  <option value="OPEN">Aberta</option>
                  <option value="DRAFT">Rascunho</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Inicio da votacao</span>
                <input type="datetime-local" value={votingStartsAt} onChange={(event) => setVotingStartsAt(event.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Fim da votacao</span>
                <input type="datetime-local" value={votingEndsAt} onChange={(event) => setVotingEndsAt(event.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Data da reuniao</span>
                <input type="datetime-local" value={meetingAt} onChange={(event) => setMeetingAt(event.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Quorum minimo (%)</span>
                <input type="number" min={0} max={100} value={quorumMinPercent} onChange={(event) => setQuorumMinPercent(event.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Aprovacao minima (%)</span>
                <input type="number" min={0} max={100} value={approvalMinPercent} onChange={(event) => setApprovalMinPercent(event.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Permitir comentarios durante a assembleia
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Anexo da pauta (PDF, DOC, imagens)</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                {attachmentFile && <p className="mt-1 text-xs text-slate-500 truncate">Selecionado: {attachmentFile.name}</p>}
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">Ou assine aqui mesmo</p>
              <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setSignatureDataUrl("")} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Limpar assinatura
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Opcao 1", value: optionA, setter: setOptionA, placeholder: "Aprovar" },
                { label: "Opcao 2", value: optionB, setter: setOptionB, placeholder: "Rejeitar" },
                { label: "Opcao 3", value: optionC, setter: setOptionC, placeholder: "Opcional" },
              ].map((option) => (
                <label key={option.label} className="block">
                  <span className="text-xs font-semibold text-slate-600">{option.label}</span>
                  <input value={option.value} onChange={(event) => option.setter(event.target.value)} placeholder={option.placeholder} className={`mt-1 ${inputClass}`} />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                <PlusCircle size={16} />
                {creating ? "Publicando..." : "Publicar assembleia"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedPoll ? (
        <ModalShell
          title={selectedPoll.title}
          subtitle={`Convocada por ${selectedPoll.createdBy} em ${formatDate(selectedPoll.createdAt)}`}
          onClose={() => setSelectedPollId(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusMeta(selectedPoll.status).className}`}>
                  {getStatusMeta(selectedPoll.status).label}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {getAssemblyTypeLabel(selectedPoll.assemblyType)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {getModeLabel(selectedPoll.meetingMode)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {getScopeLabel(selectedPoll.scope)}
                </span>
              </div>

              <p className="mt-4 m-0 text-sm leading-7 text-slate-700">{selectedPoll.description || "Sem descricao adicional."}</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Janela de votacao</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedPoll.votingStartsAt)} ate {formatDate(selectedPoll.votingEndsAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reuniao</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedPoll.meetingAt)}</p>
                </div>
              </div>

              {(selectedPoll.attachmentUrl || selectedPoll.creatorSignatureUrl) && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {selectedPoll.attachmentUrl && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Anexo</p>
                      <a href={selectedPoll.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-sky-700 hover:underline">
                        {selectedPoll.attachmentName ?? "Documento da pauta"}
                      </a>
                    </div>
                  )}
                  {selectedPoll.creatorSignatureUrl && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assinatura de abertura</p>
                      <p className="text-xs text-slate-500">{selectedPoll.creatorSignatureName ?? "Responsavel"}</p>
                      <img src={selectedPoll.creatorSignatureUrl} alt="Assinatura" className="mt-2 h-20 max-w-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-500">
                <Vote size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Deliberacao</span>
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
                      disabled={busyPollId === selectedPoll.id || selectedPoll.status !== "OPEN"}
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
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Manifestacoes</span>
                </div>
                <span className="text-xs text-slate-400">{selectedPoll.comments.length} registro(s)</span>
              </div>

              <div className="mt-4 space-y-3">
                {selectedPoll.comments.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Ainda nao ha comentarios nesta assembleia.
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

              {selectedPoll.allowComments ? (
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={commentDrafts[selectedPoll.id] ?? ""}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [selectedPoll.id]: event.target.value }))}
                    placeholder="Escreva um comentario sobre esta assembleia"
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
              ) : (
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Comentarios desativados para esta assembleia.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Ata resumida</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintMinutes(selectedPoll)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Printer size={16} />
                  Imprimir / salvar PDF
                </button>
              </div>
              <textarea
                value={minutesDraft}
                onChange={(event) => setMinutesDraft(event.target.value)}
                rows={5}
                disabled={!canManage}
                placeholder="Registre o resultado final, quorum observado e encaminhamentos."
                className={`mt-4 resize-none ${inputClass} disabled:bg-slate-50`}
              />

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pre-visualizacao do documento</p>
                <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
                  <h4 className="m-0 text-base font-semibold text-slate-950">Ata de Assembleia Digital</h4>
                  <p className="mt-3"><strong>Pauta:</strong> {selectedPoll.title}</p>
                  <p><strong>Tipo:</strong> {getAssemblyTypeLabel(selectedPoll.assemblyType)}</p>
                  <p><strong>Modalidade:</strong> {getModeLabel(selectedPoll.meetingMode)}</p>
                  <p><strong>Janela de votacao:</strong> {formatDateDocument(selectedPoll.votingStartsAt)} ate {formatDateDocument(selectedPoll.votingEndsAt)}</p>
                  <p><strong>Quorum minimo:</strong> {selectedPoll.quorumMinPercent}%</p>
                  <p><strong>Aprovacao minima:</strong> {selectedPoll.approvalMinPercent}%</p>
                  <p><strong>Resultado atual:</strong> {getWinningOption(selectedPoll)?.text ?? "Sem definicao"}</p>
                  <p className="mt-3 whitespace-pre-wrap">{minutesDraft.trim() || "A ata resumida aparecera aqui assim que for preenchida."}</p>
                </div>
              </div>

              {canManage && selectedPoll.status !== "CLOSED" ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCloseAssembly(selectedPoll.id)}
                    disabled={busyPollId === selectedPoll.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    Encerrar assembleia
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </ModalShell>
      ) : null}
    </AppLayout>
  );
}
