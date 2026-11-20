import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileUp, X } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import { createDocumento, DOCUMENT_TYPES, type DocumentoTipo } from "../../../features/documentos/services/documentos";

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white";
const labelCls = "block text-xs font-bold text-gray-500 mb-1.5";

export default function DocumentosNovo() {
  const nav = useNavigate();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<DocumentoTipo>("outro");
  const [descricao, setDescricao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setErr("Informe o nome do documento."); return; }
    setSaving(true);
    setErr("");
    try {
      await createDocumento({
        nome,
        tipo,
        descricao: descricao || undefined,
        dataValidade: dataValidade || null,
        arquivo,
      });
      nav("/predio/documentos");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar documento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Novo Documento">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <button onClick={() => nav("/predio/documentos")} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Voltar para documentos
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Novo documento</h2>

          <div>
            <label className={labelCls}>Nome do documento <span className="text-red-400">*</span></label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: AVCB 2024" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as DocumentoTipo)} className={inputCls}>
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} — prazo de guarda: {t.guarda}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              rows={3} placeholder="Informações adicionais sobre o documento..."
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className={labelCls}>Data de validade / expiração</label>
            <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} className={inputCls} />
            {dataValidade && (
              <p className="mt-1 text-[11px] text-indigo-500">
                Você será notificado 3 dias antes e no dia do vencimento.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Anexo</label>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <FileUp size={16} className="text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-700 truncate">{arquivo.name}</p>
                  <p className="text-[11px] text-indigo-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => setArquivo(null)} className="text-indigo-400 hover:text-indigo-600">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <FileUp size={24} className="text-gray-300" />
                <span className="text-sm text-gray-400">Clique para selecionar o arquivo</span>
                <span className="text-[11px] text-gray-300">PDF, JPG, PNG, DOCX — máx. 20 MB</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls"
                  onChange={e => setArquivo(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 text-red-500 mt-0.5" />
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => nav("/predio/documentos")}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
              {saving ? "Salvando..." : "Salvar documento"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
