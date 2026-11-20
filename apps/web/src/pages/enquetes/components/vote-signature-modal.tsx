import { SignaturePad } from "./signature-pad";
import { ModalShell } from "./modal-shell";

type Props = {
  open: boolean;
  signatureDataUrl: string;
  onSignatureChange: (v: string) => void;
  signing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function VoteSignatureModal({ open, signatureDataUrl, onSignatureChange, signing, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <ModalShell
      title="Assine para registrar seu voto"
      subtitle="Por exigencia da assembleia, cada voto precisa ser acompanhado de uma assinatura digital."
      onClose={onCancel}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Desenhe sua assinatura abaixo. Ela sera armazenada junto ao seu voto nesta assembleia para auditoria interna.
        </p>
        <SignaturePad value={signatureDataUrl} onChange={onSignatureChange} />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!signatureDataUrl || signing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signing ? "Registrando voto..." : "Assinar e votar"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
