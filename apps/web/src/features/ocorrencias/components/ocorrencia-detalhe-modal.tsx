import { Lock, X } from "lucide-react";
import { Toggle } from "../../../components/ui/toggle";
import { CATEGORIAS, STATUS_OPTIONS, URGENCIA_BAR } from "../constants/ocorrencias.constants";
import { type Ocorrencia, type OcorrenciaStatus } from "../services/ocorrencias";

const inputCls =
  "px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

type OcorrenciaDetalheModalProps = {
  detalhe: Ocorrencia | null;
  isAdmin: boolean;
  isOwner: (o: Ocorrencia) => boolean;
  onClose: () => void;
  // admin fields
  editStatus: OcorrenciaStatus;
  setEditStatus: (v: OcorrenciaStatus) => void;
  editResponsavel: string;
  setEditResponsavel: (v: string) => void;
  editRespostaInterna: string;
  setEditRespostaInterna: (v: string) => void;
  editRespostaMorador: string;
  setEditRespostaMorador: (v: string) => void;
  editMotivoCancelamento: string;
  setEditMotivoCancelamento: (v: string) => void;
  // morador fields
  editAssunto: string;
  setEditAssunto: (v: string) => void;
  editDescricao: string;
  setEditDescricao: (v: string) => void;
  editCategoria: string;
  setEditCategoria: (v: string) => void;
  editPrivado: boolean;
  setEditPrivado: (v: boolean) => void;
  // handlers
  onSaveAdmin: (e: React.FormEvent<HTMLFormElement>) => void;
  onSaveMorador: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  saveError: string;
};

export function OcorrenciaDetalheModal({
  detalhe,
  isAdmin,
  isOwner,
  onClose,
  editStatus,
  setEditStatus,
  editResponsavel,
  setEditResponsavel,
  editRespostaInterna,
  setEditRespostaInterna,
  editRespostaMorador,
  setEditRespostaMorador,
  editMotivoCancelamento,
  setEditMotivoCancelamento,
  editAssunto,
  setEditAssunto,
  editDescricao,
  setEditDescricao,
  editCategoria,
  setEditCategoria,
  editPrivado,
  setEditPrivado,
  onSaveAdmin,
  onSaveMorador,
  saving,
  saveError,
}: OcorrenciaDetalheModalProps) {
  if (!detalhe) return null;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white border border-gray-200 rounded-2xl shadow-2xl w-full p-6 max-h-[90vh] overflow-y-auto ${detalhe.arquivo_url ? "max-w-xl md:max-w-5xl" : "max-w-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra colorida no topo */}
        <div className={`-mx-6 -mt-6 h-1 rounded-t-2xl mb-6 ${URGENCIA_BAR[detalhe.urgencia]}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {detalhe.privado && (
                <span className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                  <Lock size={10} /> Privado
                </span>
              )}
            </div>
            <h3 className="m-0 text-lg font-semibold text-gray-900">{detalhe.assunto}</h3>
            <p className="mt-1 text-sm text-gray-400">
              {detalhe.protocolo} · {detalhe.categoria} · {detalhe.localizacao}
            </p>
          </div>
          <button
            className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — duas colunas no desktop quando há imagem */}
        <div className={detalhe.arquivo_url ? "grid md:grid-cols-[360px_1fr] gap-6 items-start" : "grid gap-4"}>

          {/* Coluna esquerda — imagem */}
          {detalhe.arquivo_url && (
            <div className="flex flex-col gap-2 items-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-start">
                Imagem da ocorrência
              </p>
              <a
                href={detalhe.arquivo_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full flex justify-center"
              >
                <img
                  src={detalhe.arquivo_url}
                  alt="Imagem da ocorrência"
                  className="w-full rounded-xl border border-gray-200 object-contain max-h-96 cursor-zoom-in hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}

          {/* Coluna direita — info + formulários */}
          <div className="grid gap-4">
            {/* Descrição */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descrição</p>
              <p className="text-sm text-gray-800 m-0 leading-relaxed">{detalhe.descricao}</p>
            </div>

            {/* Resposta ao morador */}
            {detalhe.resposta_morador && !isAdmin && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                  Resposta da administração
                </p>
                <p className="text-sm text-green-900 m-0">{detalhe.resposta_morador}</p>
              </div>
            )}

            {/* Motivo de cancelamento */}
            {detalhe.status === "Cancelado" && detalhe.motivo_cancelamento && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Motivo do cancelamento
                </p>
                <p className="text-sm text-gray-700 m-0">{detalhe.motivo_cancelamento}</p>
              </div>
            )}

            {/* ── Form ADMIN ── */}
            {isAdmin && (
              <form className="grid gap-4" onSubmit={onSaveAdmin}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OcorrenciaStatus)}
                      className={inputCls}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-600">Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Zelador João"
                      value={editResponsavel}
                      onChange={(e) => setEditResponsavel(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                {editStatus === "Cancelado" && (
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-600">
                      Motivo do cancelamento <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={editMotivoCancelamento}
                      onChange={(e) => setEditMotivoCancelamento(e.target.value)}
                      rows={2}
                      required
                      placeholder="Descreva o motivo pelo qual a ocorrência está sendo cancelada..."
                      className={`${inputCls} resize-none border-rose-200 focus:border-rose-400 focus:ring-rose-100`}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">
                    Nota interna{" "}
                    <span className="text-gray-400 font-normal">(não visível ao morador)</span>
                  </label>
                  <textarea
                    value={editRespostaInterna}
                    onChange={(e) => setEditRespostaInterna(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Observações internas..."
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Resposta ao morador</label>
                  <textarea
                    value={editRespostaMorador}
                    onChange={(e) => setEditRespostaMorador(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="Mensagem que o morador verá..."
                  />
                </div>
                {saveError && <p className="text-sm text-red-500 m-0">{saveError}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-all"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Form MORADOR (dono) ── */}
            {!isAdmin && isOwner(detalhe) && (
              <form className="grid gap-4 border-t border-gray-100 pt-4" onSubmit={onSaveMorador}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide m-0">
                  Editar ocorrência
                </p>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Assunto</label>
                  <input
                    type="text"
                    value={editAssunto}
                    onChange={(e) => setEditAssunto(e.target.value)}
                    className={inputCls}
                    maxLength={100}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Descrição</label>
                  <textarea
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Categoria</label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
                    className={inputCls}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <Toggle
                  checked={editPrivado}
                  onChange={setEditPrivado}
                  label="Ocorrência privada"
                  sublabel="Somente administradores poderão visualizar"
                />
                {saveError && <p className="text-sm text-red-500 m-0">{saveError}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-all"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Morador não dono — só fechar ── */}
            {!isAdmin && !isOwner(detalhe) && (
              <div className="flex justify-end">
                <button
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
                  onClick={onClose}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
