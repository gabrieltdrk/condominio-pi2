import { Paperclip, X } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Toggle } from "../../../components/ui/toggle";
import { CATEGORIAS, LOCALIZACOES, URGENCIA_COLORS } from "../constants/ocorrencias.constants";
import { PRIORIDADE_POR_CATEGORIA, type CreateOcorrenciaPayload } from "../services/ocorrencias";

const inputCls =
  "px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

type OcorrenciaCriarModalProps = {
  open: boolean;
  form: CreateOcorrenciaPayload;
  onCategoriaChange: (cat: string) => void;
  onFieldChange: (updates: Partial<CreateOcorrenciaPayload>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitting: boolean;
  formError: string;
  anexoFile: File | null;
  onAnexoChange: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export function OcorrenciaCriarModal({
  open,
  form,
  onCategoriaChange,
  onFieldChange,
  onSubmit,
  onClose,
  submitting,
  formError,
  anexoFile,
  onAnexoChange,
  fileInputRef,
}: OcorrenciaCriarModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="m-0 text-lg font-semibold text-gray-900">Nova Ocorrência</h3>
          <button
            className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-gray-600">Categoria</label>
              <select
                value={form.categoria}
                onChange={(e) => onCategoriaChange(e.target.value)}
                className={inputCls}
                required
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-gray-600">Localização</label>
              <select
                value={form.localizacao}
                onChange={(e) => onFieldChange({ localizacao: e.target.value })}
                className={inputCls}
                required
              >
                {LOCALIZACOES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-600">Assunto</label>
            <input
              type="text"
              placeholder="Título curto do problema"
              value={form.assunto}
              onChange={(e) => onFieldChange({ assunto: e.target.value })}
              required
              maxLength={100}
              className={inputCls}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-600">Descrição detalhada</label>
            <textarea
              placeholder="Descreva o ocorrido com o máximo de detalhes..."
              value={form.descricao}
              onChange={(e) => onFieldChange({ descricao: e.target.value })}
              required
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Prioridade — somente leitura */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Prioridade:</span>
            <Badge text={form.urgencia} cls={URGENCIA_COLORS[form.urgencia]} />
          </div>

          {/* Flag privado */}
          <Toggle
            checked={form.privado}
            onChange={(v) => onFieldChange({ privado: v })}
            label="Ocorrência privada"
            sublabel="Somente administradores poderão visualizar"
          />

          {/* Anexo */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-600">
              Anexo <span className="text-gray-400 font-normal">(PDF, Word, Imagem — máx 10MB)</span>
            </label>
            <div
              className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-500 flex-1 truncate">
                {anexoFile ? anexoFile.name : "Clique para selecionar um arquivo"}
              </span>
              {anexoFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnexoChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-gray-400 hover:text-rose-500 shrink-0 border-none bg-transparent cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => onAnexoChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {formError && <p className="text-sm text-red-500 m-0">{formError}</p>}

          <div className="flex justify-end gap-3 mt-1">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-all"
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Enviar ocorrência"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Re-export para facilitar uso externo
export { PRIORIDADE_POR_CATEGORIA };
