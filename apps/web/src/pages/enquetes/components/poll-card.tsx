import { Check, ChevronRight, Clock3, MessageSquare, TrendingUp, Users, X } from "lucide-react";
import type { Poll } from "../../../features/enquetes/services/enquetes";
import { formatDate, getPollTotalVotes, getStatusMeta, getWinningOption, getAssemblyTypeLabel, getModeLabel, getScopeLabel } from "../utils/poll-calc";

type Props = {
  poll: Poll;
  voterId: string;
  busyPollId: string | null;
  signing: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onViewDetails: (pollId: string) => void;
};

export function PollCard({ poll, voterId, busyPollId, signing, onVote, onViewDetails }: Props) {
  const totalVotes = getPollTotalVotes(poll);
  const selectedOptionId = poll.options.find((option) => option.votes.includes(voterId))?.id;
  const selectedOption = poll.options.find((option) => option.id === selectedOptionId) ?? null;
  const winner = getWinningOption(poll);
  const statusMeta = getStatusMeta(poll.status);
  const winnerVotes = winner?.votes.length ?? 0;
  const winnerPct = totalVotes > 0 ? Math.round((winnerVotes / totalVotes) * 100) : 0;
  const isOpen = poll.status === "OPEN";
  const busy = busyPollId === poll.id || signing;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isOpen ? "bg-linear-to-r from-sky-400 to-emerald-400" : "bg-linear-to-r from-slate-300 to-slate-400"}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-slate-900">{poll.title}</h3>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            {selectedOption && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Você votou
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onViewDetails(poll.id)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          >
            Ver detalhes
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{poll.description || "Sem descrição adicional."}</p>

        {/* Meta pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill>{getAssemblyTypeLabel(poll.assemblyType)}</Pill>
          <Pill>{getModeLabel(poll.meetingMode)}</Pill>
          <Pill>{getScopeLabel(poll.scope)}</Pill>
          <Pill>Quórum {poll.quorumMinPercent}%</Pill>
          <Pill>Aprovação {poll.approvalMinPercent}%</Pill>
        </div>

        {/* Stats + voting row */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <StatChip icon={<Users size={13} />} label={`${totalVotes} voto${totalVotes !== 1 ? "s" : ""}`} />
            <StatChip icon={<MessageSquare size={13} />} label={`${poll.comments.length} comentário${poll.comments.length !== 1 ? "s" : ""}`} />
            <StatChip icon={<Clock3 size={13} />} label={`${formatDate(poll.votingStartsAt)} → ${formatDate(poll.votingEndsAt)}`} />
            {winner && (
              <StatChip icon={<TrendingUp size={13} />} label={`Liderando: ${winner.text} (${winnerPct}%)`} accent />
            )}
          </div>

          {/* Vote buttons */}
          {isOpen && (
            <div className="flex flex-wrap gap-2">
              {poll.options.slice(0, 3).map((option) => {
                const isSelected = option.id === selectedOptionId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onVote(poll.id, option.id)}
                    disabled={busy}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${getOptionStyle(option.text, isSelected)}`}
                  >
                    {getOptionIcon(option.text)}
                    {option.text}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress bar for leader */}
        {totalVotes > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${isOpen ? "bg-linear-to-r from-sky-400 to-emerald-400" : "bg-slate-300"}`}
                style={{ width: `${winnerPct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{winner ? `${winner.text} lidera com ${winnerPct}%` : "Sem votos ainda"}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      {children}
    </span>
  );
}

function StatChip({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${accent ? "text-emerald-600" : "text-slate-500"}`}>
      {icon}
      {label}
    </span>
  );
}

function getOptionStyle(text: string, isSelected: boolean) {
  const n = normalizeOptionText(text);
  const isApprove = n.includes("aprova") || n === "sim";
  const isReject = n.includes("rejeita") || n === "rejeitar" || n === "nao" || n === "nao aprovar";

  if (isApprove) {
    return isSelected
      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }
  if (isReject) {
    return isSelected
      ? "border-rose-300 bg-rose-100 text-rose-700"
      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
  }
  return isSelected
    ? "border-sky-600 bg-sky-600 text-white"
    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700";
}

function getOptionIcon(text: string) {
  const n = normalizeOptionText(text);
  if (n.includes("aprova") || n === "sim") return <Check size={14} />;
  if (n.includes("rejeita") || n === "rejeitar" || n === "nao" || n === "nao aprovar") return <X size={14} />;
  return null;
}

function normalizeOptionText(text: string) {
  return text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
