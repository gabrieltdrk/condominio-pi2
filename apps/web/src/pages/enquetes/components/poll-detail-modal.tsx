import { CheckCircle2, Clock3, FileText, Printer, SendHorizonal, Users, Vote } from "lucide-react";
import type { Poll, PollSignatureLog } from "../../../features/enquetes/services/enquetes";
import { formatDate, getPollTotalVotes, getStatusMeta, getAssemblyTypeLabel, getModeLabel, getScopeLabel, getWinningOption } from "../utils/poll-calc";
import { formatDateDocument } from "../utils/minutes-builder";
import { ModalShell } from "./modal-shell";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

type Props = {
  poll: Poll | null;
  voterId: string;
  canManage: boolean;
  busyPollId: string | null;
  signing: boolean;
  signatureLogs: PollSignatureLog[];
  loadingSignatureLogs: boolean;
  minutesDraft: string;
  onMinutesDraftChange: (v: string) => void;
  commentDrafts: Record<string, string>;
  onCommentDraftChange: (pollId: string, value: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  onCommentSubmit: (pollId: string) => void;
  onCloseAssembly: (pollId: string) => void;
  onPrintMinutes: (poll: Poll) => void;
  onClose: () => void;
};

export function PollDetailModal({
  poll, voterId, canManage, busyPollId, signing,
  signatureLogs, loadingSignatureLogs,
  minutesDraft, onMinutesDraftChange,
  commentDrafts, onCommentDraftChange,
  onVote, onCommentSubmit, onCloseAssembly, onPrintMinutes,
  onClose,
}: Props) {
  if (!poll) return null;

  return (
    <ModalShell
      title={poll.title}
      subtitle={`Convocada por ${poll.createdBy} em ${formatDate(poll.createdAt)}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusMeta(poll.status).className}`}>
              {getStatusMeta(poll.status).label}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getAssemblyTypeLabel(poll.assemblyType)}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getModeLabel(poll.meetingMode)}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getScopeLabel(poll.scope)}</span>
          </div>

          <p className="mt-4 m-0 text-sm leading-7 text-slate-700">{poll.description || "Sem descricao adicional."}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Janela de votacao</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(poll.votingStartsAt)} ate {formatDate(poll.votingEndsAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reuniao</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(poll.meetingAt)}</p>
            </div>
          </div>

          {(poll.attachmentUrl || poll.creatorSignatureUrl) && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {poll.attachmentUrl && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Anexo</p>
                  <a href={poll.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-sky-700 hover:underline">
                    {poll.attachmentName ?? "Documento da pauta"}
                  </a>
                </div>
              )}
              {poll.creatorSignatureUrl && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assinatura de abertura</p>
                  <p className="text-xs text-slate-500">{poll.creatorSignatureName ?? "Responsavel"}</p>
                  <img src={poll.creatorSignatureUrl} alt="Assinatura" className="mt-2 h-20 max-w-full object-contain" />
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
            {poll.options.map((option) => {
              const totalVotes = getPollTotalVotes(poll);
              const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
              const isSelected = option.votes.includes(voterId);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onVote(poll.id, option.id)}
                  disabled={busyPollId === poll.id || poll.status !== "OPEN" || signing}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                    isSelected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/70"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">{option.text}</span>
                    <span className="text-xs font-semibold text-slate-500">{option.votes.length} voto(s) • {percentage}%</span>
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
              <Users size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Assinaturas registradas</span>
            </div>
            <span className="text-xs text-slate-400">{signatureLogs.length} assinatura(s)</span>
          </div>
          <div className="mt-4 space-y-3">
            {loadingSignatureLogs ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Carregando assinaturas...</div>
            ) : signatureLogs.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Nenhuma assinatura registrada ainda.</div>
            ) : (
              signatureLogs.map((log) => (
                <div key={`${log.pollId}-${log.userId}`} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="m-0 text-sm font-semibold text-slate-900">{log.signerName}</p>
                    <span className="text-[11px] text-slate-400">{formatDate(log.signedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock3 size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Manifestacoes</span>
            </div>
            <span className="text-xs text-slate-400">{poll.comments.length} registro(s)</span>
          </div>
          <div className="mt-4 space-y-3">
            {poll.comments.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Ainda nao ha comentarios nesta assembleia.</div>
            ) : (
              poll.comments.map((comment) => (
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
          {poll.allowComments ? (
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={commentDrafts[poll.id] ?? ""}
                onChange={(e) => onCommentDraftChange(poll.id, e.target.value)}
                placeholder="Escreva um comentario sobre esta assembleia"
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => void onCommentSubmit(poll.id)}
                disabled={busyPollId === poll.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SendHorizonal size={16} />
                Comentar
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">Comentarios desativados para esta assembleia.</div>
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
              onClick={() => onPrintMinutes(poll)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <Printer size={16} />
              Imprimir / salvar PDF
            </button>
          </div>
          <textarea
            value={minutesDraft}
            onChange={(e) => onMinutesDraftChange(e.target.value)}
            rows={5}
            disabled={!canManage}
            placeholder="Registre o resultado final, quorum observado e encaminhamentos."
            className={`mt-4 resize-none ${inputClass} disabled:bg-slate-50`}
          />
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pre-visualizacao do documento</p>
            <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
              <h4 className="m-0 text-base font-semibold text-slate-950">Ata de Assembleia Digital</h4>
              <p className="mt-3"><strong>Pauta:</strong> {poll.title}</p>
              <p><strong>Tipo:</strong> {getAssemblyTypeLabel(poll.assemblyType)}</p>
              <p><strong>Modalidade:</strong> {getModeLabel(poll.meetingMode)}</p>
              <p><strong>Janela de votacao:</strong> {formatDateDocument(poll.votingStartsAt)} ate {formatDateDocument(poll.votingEndsAt)}</p>
              <p><strong>Quorum minimo:</strong> {poll.quorumMinPercent}%</p>
              <p><strong>Aprovacao minima:</strong> {poll.approvalMinPercent}%</p>
              <p><strong>Resultado atual:</strong> {getWinningOption(poll)?.text ?? "Sem definicao"}</p>
              <p className="mt-3 whitespace-pre-wrap">{minutesDraft.trim() || "A ata resumida aparecera aqui assim que for preenchida."}</p>
            </div>
          </div>
          {canManage && poll.status !== "CLOSED" ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void onCloseAssembly(poll.id)}
                disabled={busyPollId === poll.id}
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
  );
}
