import { useEffect, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { AVISO_TIPOS, type AvisoTipo, type CreateAvisoPayload, type CondominioSimples, type MoradorOption, listCondominiosAtivos, listMoradoresDoCondominio } from "../services/avisos";
import { getUser } from "../../auth/services/auth";

const inputCls =
  "px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

type AvisoFormProps = {
  form: CreateAvisoPayload;
  onFieldChange: (field: keyof CreateAvisoPayload, value: string | null) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
  anexoFile: File | null;
  onAnexoChange: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  submitLabel: string;
  onCondominioChange?: (uuid: string | null) => void;
  selectedCondominioUUID?: string | null;
};

export function AvisoForm({
  form,
  onFieldChange,
  onSubmit,
  onClose,
  submitting,
  error,
  anexoFile,
  onAnexoChange,
  fileInputRef,
  submitLabel,
  onCondominioChange,
  selectedCondominioUUID,
}: AvisoFormProps) {
  const user = getUser();
  const isMasterAdmin = user?.role === "MASTER_ADMIN";
  const condominioUUID = selectedCondominioUUID ?? user?.condominioUUID ?? null;

  const [condominios, setCondominios] = useState<CondominioSimples[]>([]);
  const [moradores, setMoradores] = useState<MoradorOption[]>([]);
  const [destinoTipo, setDestinoTipo] = useState<"condominio" | "pessoa">("condominio");

  // Carrega lista de condomínios se MASTER_ADMIN
  useEffect(() => {
    if (!isMasterAdmin) return;
    listCondominiosAtivos().then(setCondominios);
  }, [isMasterAdmin]);

  // Carrega moradores quando condomínio estiver definido e destino for "pessoa"
  useEffect(() => {
    if (!condominioUUID || destinoTipo !== "pessoa") {
      setMoradores([]);
      onFieldChange("destinatario_user_id", null);
      return;
    }
    listMoradoresDoCondominio(condominioUUID).then(setMoradores);
  }, [condominioUUID, destinoTipo]);

  function handleDestinoTipo(tipo: "condominio" | "pessoa") {
    setDestinoTipo(tipo);
    if (tipo === "condominio") onFieldChange("destinatario_user_id", null);
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>

      {/* 1. Seletor de condomínio — só MASTER_ADMIN */}
      {isMasterAdmin && (
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-600">Condomínio</label>
          <select
            value={selectedCondominioUUID ?? ""}
            onChange={(e) => onCondominioChange?.(e.target.value || null)}
            required
            className={inputCls}
          >
            <option value="">Selecione um condomínio</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Destinatário */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-600">Enviar para</label>
          <select
            value={destinoTipo}
            onChange={(e) => handleDestinoTipo(e.target.value as "condominio" | "pessoa")}
            className={inputCls}
          >
            <option value="condominio">Condomínio inteiro</option>
            <option value="pessoa">Pessoa específica</option>
          </select>
        </div>

        {destinoTipo === "pessoa" && (
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-600">Morador</label>
            <select
              value={form.destinatario_user_id ?? ""}
              onChange={(e) => onFieldChange("destinatario_user_id", e.target.value || null)}
              required
              className={inputCls}
              disabled={!condominioUUID || moradores.length === 0}
            >
              <option value="">
                {!condominioUUID
                  ? "Selecione um condomínio primeiro"
                  : moradores.length === 0
                  ? "Carregando..."
                  : "Selecione um morador"}
              </option>
              {moradores.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Título */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-gray-600">Título</label>
        <input
          type="text"
          placeholder="Título do aviso"
          value={form.titulo}
          onChange={(e) => onFieldChange("titulo", e.target.value)}
          required
          maxLength={120}
          className={inputCls}
        />
      </div>

      {/* 4. Descrição */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-gray-600">Descrição</label>
        <textarea
          placeholder="Descreva o aviso com detalhes..."
          value={form.descricao}
          onChange={(e) => onFieldChange("descricao", e.target.value)}
          required
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* 5. Tipo + Data expiração */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-600">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => onFieldChange("tipo", e.target.value as AvisoTipo)}
            className={inputCls}
          >
            {AVISO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-600">
            Data de expiração <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              lang="pt-BR"
              value={form.data_expiracao ?? ""}
              onChange={(e) => onFieldChange("data_expiracao", e.target.value)}
              className={inputCls}
            />
            {form.data_expiracao && (
              <button
                type="button"
                onClick={() => onFieldChange("data_expiracao", "")}
                className="px-3 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200 cursor-pointer text-xs shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. Anexo */}
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
        {form.arquivo_url && !anexoFile && (
          <p className="text-xs text-indigo-600 flex items-center gap-1">
            <Paperclip size={11} /> Anexo atual:{" "}
            <a href={form.arquivo_url} target="_blank" rel="noreferrer" className="underline">
              ver arquivo
            </a>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500 m-0">{error}</p>}

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
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
