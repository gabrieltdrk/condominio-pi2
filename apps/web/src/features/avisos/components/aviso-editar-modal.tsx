import { X } from "lucide-react";
import type { Aviso, CreateAvisoPayload } from "../services/avisos";
import { AvisoForm } from "./aviso-form";

type AvisoEditarModalProps = {
  editando: Aviso | null;
  form: CreateAvisoPayload;
  onFieldChange: (field: keyof CreateAvisoPayload, value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
  anexoFile: File | null;
  onAnexoChange: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export function AvisoEditarModal({
  editando,
  form,
  onFieldChange,
  onSubmit,
  onClose,
  submitting,
  error,
  anexoFile,
  onAnexoChange,
  fileInputRef,
}: AvisoEditarModalProps) {
  if (!editando) return null;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="m-0 text-lg font-semibold text-gray-900">Editar Aviso</h3>
          <button
            className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <AvisoForm
          form={form}
          onFieldChange={onFieldChange}
          onSubmit={onSubmit}
          onClose={onClose}
          submitting={submitting}
          error={error}
          anexoFile={anexoFile}
          onAnexoChange={onAnexoChange}
          fileInputRef={fileInputRef}
          submitLabel={submitting ? "Salvando..." : "Salvar alterações"}
        />
      </div>
    </div>
  );
}
