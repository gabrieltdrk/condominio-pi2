import { type FormEvent } from "react";
import { PlusCircle } from "lucide-react";
import type { AssemblyMode, AssemblyScope, AssemblyStatus, AssemblyType } from "../../../features/enquetes/services/enquetes";
import { SignaturePad } from "./signature-pad";
import { ModalShell } from "./modal-shell";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export type CreatePollDraft = {
  title: string;
  description: string;
  optionA: string;
  optionB: string;
  optionC: string;
  assemblyType: AssemblyType;
  meetingMode: AssemblyMode;
  scope: AssemblyScope;
  status: AssemblyStatus;
  meetingAt: string;
  votingStartsAt: string;
  votingEndsAt: string;
  quorumMinPercent: string;
  approvalMinPercent: string;
  allowComments: boolean;
  attachmentFile: File | null;
  signatureFile: File | null;
  signatureDataUrl: string;
};

export function emptyCreatePollDraft(): CreatePollDraft {
  return {
    title: "", description: "", optionA: "", optionB: "", optionC: "",
    assemblyType: "ORDINARIA", meetingMode: "DIGITAL", scope: "GERAL",
    status: "OPEN", meetingAt: "", votingStartsAt: "", votingEndsAt: "",
    quorumMinPercent: "50", approvalMinPercent: "50", allowComments: true,
    attachmentFile: null, signatureFile: null, signatureDataUrl: "",
  };
}

type Props = {
  open: boolean;
  draft: CreatePollDraft;
  setDraft: React.Dispatch<React.SetStateAction<CreatePollDraft>>;
  creating: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function PollFormModal({ open, draft, setDraft, creating, onClose, onSubmit }: Props) {
  if (!open) return null;

  function patch<K extends keyof CreatePollDraft>(key: K, value: CreatePollDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ModalShell title="Nova assembleia" subtitle="Configure a convocacao, pauta e regras de votacao." onClose={onClose}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Titulo da pauta</span>
          <input value={draft.title} onChange={(e) => patch("title", e.target.value)} placeholder="Ex.: Aprovacao da pintura da fachada" className={`mt-1 ${inputClass}`} />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Descricao</span>
          <textarea value={draft.description} onChange={(e) => patch("description", e.target.value)} placeholder="Explique a pauta, impactos e orientacoes para os moradores." rows={4} className={`mt-1 resize-none ${inputClass}`} />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Tipo</span>
            <select value={draft.assemblyType} onChange={(e) => patch("assemblyType", e.target.value as AssemblyType)} className={`mt-1 ${inputClass}`}>
              <option value="ORDINARIA">Ordinaria</option>
              <option value="EXTRAORDINARIA">Extraordinaria</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Modalidade</span>
            <select value={draft.meetingMode} onChange={(e) => patch("meetingMode", e.target.value as AssemblyMode)} className={`mt-1 ${inputClass}`}>
              <option value="DIGITAL">Digital</option>
              <option value="HIBRIDA">Hibrida</option>
              <option value="PRESENCIAL">Presencial</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Escopo</span>
            <select value={draft.scope} onChange={(e) => patch("scope", e.target.value as AssemblyScope)} className={`mt-1 ${inputClass}`}>
              <option value="GERAL">Geral</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
              <option value="EMERGENCIAL">Emergencial</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Status inicial</span>
            <select value={draft.status} onChange={(e) => patch("status", e.target.value as AssemblyStatus)} className={`mt-1 ${inputClass}`}>
              <option value="OPEN">Aberta</option>
              <option value="DRAFT">Rascunho</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Inicio da votacao</span>
            <input type="datetime-local" value={draft.votingStartsAt} onChange={(e) => patch("votingStartsAt", e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Fim da votacao</span>
            <input type="datetime-local" value={draft.votingEndsAt} onChange={(e) => patch("votingEndsAt", e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Data da reuniao</span>
            <input type="datetime-local" value={draft.meetingAt} onChange={(e) => patch("meetingAt", e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Quorum minimo (%)</span>
            <input type="number" min={0} max={100} value={draft.quorumMinPercent} onChange={(e) => patch("quorumMinPercent", e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Aprovacao minima (%)</span>
            <input type="number" min={0} max={100} value={draft.approvalMinPercent} onChange={(e) => patch("approvalMinPercent", e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input type="checkbox" checked={draft.allowComments} onChange={(e) => patch("allowComments", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Permitir comentarios durante a assembleia
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Anexo da pauta (PDF, DOC, imagens)</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => patch("attachmentFile", e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {draft.attachmentFile && <p className="mt-1 text-xs text-slate-500 truncate">Selecionado: {draft.attachmentFile.name}</p>}
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">Ou assine aqui mesmo</p>
          <SignaturePad value={draft.signatureDataUrl} onChange={(v) => patch("signatureDataUrl", v)} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Opcao 1", key: "optionA" as const, placeholder: "Aprovar" },
            { label: "Opcao 2", key: "optionB" as const, placeholder: "Rejeitar" },
            { label: "Opcao 3", key: "optionC" as const, placeholder: "Opcional" },
          ].map((option) => (
            <label key={option.label} className="block">
              <span className="text-xs font-semibold text-slate-600">{option.label}</span>
              <input value={draft[option.key]} onChange={(e) => patch(option.key, e.target.value)} placeholder={option.placeholder} className={`mt-1 ${inputClass}`} />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={creating} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            <PlusCircle size={16} />
            {creating ? "Publicando..." : "Publicar assembleia"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
