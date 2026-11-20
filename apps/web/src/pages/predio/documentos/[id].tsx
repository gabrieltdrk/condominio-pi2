import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Calendar, Download, FileText, FileUp, History, RefreshCw, Trash2, X } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  getDocumento, getDocumentoHistorico, renovarDocumento, deleteDocumento,
  getDocumentoStatus, formatDataValidade, formatTamanho,
  type Documento,
} from "../../../features/documentos/services/documentos";

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white";
const labelCls = "block text-xs font-bold text-gray-500 mb-1.5";

const STATUS_CONFIG = {
  sem_validade: { label: "Sem validade", cls: "bg-gray-100 text-gray-500" },
  valido:       { label: "Válido",       cls: "bg-emerald-100 text-emerald-700" },
  expirando:    { label: "Expirando — renove em breve!", cls: "bg-amber-100 text-amber-700" },
  expirado:     { label: "Expirado — renovação necessária!", cls: "bg-rose-100 text-rose-700" },
};

function RenovarModal({ doc, onClose, onSuccess }: { doc: Documento; onClose: () => void; onSuccess: (d: Documento) => void }) {
  const [dataValidade, setDataValidade] = useState("");
  const [descricao, setDescricao] = useState(doc.descricao ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const renewed = await renovarDocumento(doc.id, {
        descricao: descricao || undefined,
        dataValidade: dataValidade || null,
        arquivo,
      });
      onSuccess(renewed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao renovar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900">Renovar documento</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Uma nova versão de <strong>{doc.nome}</strong> será criada. O arquivo atual ficará no histórico.
          </p>

          <div>
            <label className={labelCls}>Nova data de validade</label>
            <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} className={inputCls} />
            {dataValidade && (
              <p className="mt-1 text-[11px] text-indigo-500">Você será notificado 3 dias antes e no dia do vencimento.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              rows={2} placeholder="Notas sobre esta renovação..."
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className={labelCls}>Novo arquivo (opcional — mantém o atual se não enviado)</label>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <FileUp size={15} className="text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-700 truncate">{arquivo.name}</p>
                  <p className="text-[11px] text-indigo-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => setArquivo(null)} className="text-indigo-400 hover:text-indigo-600">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <FileUp size={16} className="text-gray-300" />
                <span className="text-sm text-gray-400">Selecionar arquivo</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls"
                  onChange={e => setArquivo(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertTriangle size={13} className="shrink-0 text-red-500 mt-0.5" />
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
              {saving ? "Renovando..." : "Confirmar renovação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DocumentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [historico, setHistorico] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [renovarOpen, setRenovarOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getDocumento(id), getDocumentoHistorico(id)]).then(([d, h]) => {
      setDoc(d);
      setHistorico(h.slice(1));
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!doc) return;
    if (!confirm(`Remover o documento "${doc.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await deleteDocumento(doc.id);
      nav("/predio/documentos");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <AppLayout title="Documento">
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
      </div>
    </AppLayout>
  );

  if (!doc) return (
    <AppLayout title="Documento">
      <div className="text-center py-20 text-gray-400">Documento não encontrado.</div>
    </AppLayout>
  );

  const status = getDocumentoStatus(doc.dataValidade);
  const sc = STATUS_CONFIG[status];

  return (
    <AppLayout title={doc.nome}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => nav("/predio/documentos")} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Documentos
          </button>
          <div className="flex gap-2">
            <button onClick={() => setRenovarOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors">
              <RefreshCw size={14} />
              Renovar
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50">
              <Trash2 size={14} />
              {deleting ? "Removendo..." : "Remover"}
            </button>
          </div>
        </div>

        {(status === "expirando" || status === "expirado") && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${status === "expirado" ? "bg-rose-50 border border-rose-100" : "bg-amber-50 border border-amber-100"}`}>
            <AlertTriangle size={16} className={status === "expirado" ? "text-rose-500 shrink-0" : "text-amber-500 shrink-0"} />
            <p className={`text-sm font-semibold ${status === "expirado" ? "text-rose-700" : "text-amber-700"}`}>
              {sc.label}
            </p>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
              <FileText size={22} className="text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{doc.nome}</h2>
              <span className="inline-block mt-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                {doc.tipoLabel}
              </span>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${sc.cls}`}>
              {STATUS_CONFIG[status].label.split(" —")[0]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Data de validade</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-800">{formatDataValidade(doc.dataValidade)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Adicionado em</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {doc.criadoPorNome && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Adicionado por</p>
                <p className="text-sm font-semibold text-gray-800">{doc.criadoPorNome}</p>
              </div>
            )}
            {doc.arquivoTamanho && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Tamanho</p>
                <p className="text-sm font-semibold text-gray-800">{formatTamanho(doc.arquivoTamanho)}</p>
              </div>
            )}
          </div>

          {doc.descricao && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Descrição</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{doc.descricao}</p>
            </div>
          )}

          {doc.arquivoUrl && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Arquivo</p>
              <a href={doc.arquivoUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <Download size={15} className="text-indigo-500" />
                <span className="truncate max-w-xs">{doc.arquivoNome ?? "Baixar arquivo"}</span>
              </a>
            </div>
          )}
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-700">Histórico de versões</h3>
            </div>
            <div className="space-y-3">
              {historico.map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <span className="text-[10px] font-bold text-gray-500">v{historico.length - i}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</p>
                    {h.dataValidade && (
                      <p className="text-[11px] text-gray-400">Validade: {formatDataValidade(h.dataValidade)}</p>
                    )}
                  </div>
                  {h.arquivoUrl && (
                    <a href={h.arquivoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-700 transition-colors">
                      <Download size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {renovarOpen && (
        <RenovarModal
          doc={doc}
          onClose={() => setRenovarOpen(false)}
          onSuccess={(renewed) => {
            setRenovarOpen(false);
            nav(`/predio/documentos/${renewed.id}`);
          }}
        />
      )}
    </AppLayout>
  );
}
