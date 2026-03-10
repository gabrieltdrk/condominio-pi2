import { ExternalLink, Paperclip, Pencil, Pin, PinOff, ThumbsUp, Trash2, X } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { AVISO_TIPO_COLORS, type Aviso } from "../services/avisos";

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

function parseDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

function fmt(d: string | null) {
  if (!d) return "—";
  const date = parseDate(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

const TIPO_BAR_COLOR: Record<string, string> = {
  Segurança: "bg-red-400",
  Manutenção: "bg-amber-400",
  Assembleia: "bg-indigo-400",
  Eventos: "bg-emerald-400",
};

type AvisoDetalheModalProps = {
  detalhe: Aviso | null;
  isAdmin: boolean;
  onClose: () => void;
  onEditar: (a: Aviso) => void;
  onFixar: (a: Aviso) => void;
  onDelete: (id: string) => void;
  onCurtir: (e: React.MouseEvent, a: Aviso) => void;
  setDetalhe: (a: Aviso | null) => void;
};

export function AvisoDetalheModal({
  detalhe,
  isAdmin,
  onClose,
  onEditar,
  onFixar,
  onDelete,
  onCurtir,
  setDetalhe,
}: AvisoDetalheModalProps) {
  if (!detalhe) return null;

  const barColor = TIPO_BAR_COLOR[detalhe.tipo] ?? "bg-blue-400";

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Faixa colorida por tipo */}
        <div className={`-mx-6 -mt-6 h-1 rounded-t-2xl mb-6 ${barColor}`} />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge text={detalhe.tipo} cls={AVISO_TIPO_COLORS[detalhe.tipo]} />
              {detalhe.fixado && (
                <span className="flex items-center gap-1 text-[11px] text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                  <Pin size={10} /> Fixado
                </span>
              )}
            </div>
            <h3 className="m-0 text-lg font-semibold text-gray-900">{detalhe.titulo}</h3>
            <p className="mt-1 text-sm text-gray-400">
              Publicado por {detalhe.author_name} · {fmt(detalhe.created_at)}
              {detalhe.data_expiracao && ` · expira ${fmt(detalhe.data_expiracao)}`}
            </p>
          </div>
          <button
            className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {detalhe.descricao}
          </p>
        </div>

        {/* Anexo */}
        {detalhe.arquivo_url && (
          <div className="mb-4">
            {isImageUrl(detalhe.arquivo_url) ? (
              <a href={detalhe.arquivo_url} target="_blank" rel="noreferrer">
                <img
                  src={detalhe.arquivo_url}
                  alt="Anexo do aviso"
                  className="w-full rounded-xl border border-gray-200 object-contain max-h-72 cursor-zoom-in hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={detalhe.arquivo_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors"
              >
                <Paperclip size={15} className="shrink-0" />
                <span className="truncate flex-1">Ver anexo</span>
                <ExternalLink size={13} className="shrink-0" />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={(e) => {
              onCurtir(e, detalhe);
              setDetalhe({
                ...detalhe,
                user_curtiu: !detalhe.user_curtiu,
                curtidas_count: detalhe.user_curtiu
                  ? detalhe.curtidas_count - 1
                  : detalhe.curtidas_count + 1,
              });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-all active:scale-95
              ${detalhe.user_curtiu
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-white border-gray-200 text-gray-500 hover:border-indigo-200"
              }`}
          >
            <ThumbsUp size={15} />
            {detalhe.curtidas_count > 0
              ? `${detalhe.curtidas_count} curtida${detalhe.curtidas_count !== 1 ? "s" : ""}`
              : "Curtir"}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button
                  onClick={() => onEditar(detalhe)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 text-sm font-semibold cursor-pointer transition-colors"
                >
                  <Pencil size={14} />
                  Editar
                </button>
                <button
                  onClick={() => { onFixar(detalhe); onClose(); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                    detalhe.fixado
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-indigo-50"
                  }`}
                >
                  {detalhe.fixado ? <PinOff size={14} /> : <Pin size={14} />}
                  {detalhe.fixado ? "Desafixar" : "Fixar"}
                </button>
                <button
                  onClick={() => onDelete(detalhe.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-gray-600 text-sm font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </>
            )}
            <button
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
