import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Search, ExternalLink } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  listDocumentos, DOCUMENT_TYPES, getDocumentoStatus, formatDataValidade,
  type Documento,
} from "../../../features/documentos/services/documentos";

const STATUS_CONFIG = {
  sem_validade: { label: "Sem validade", cls: "bg-gray-100 text-gray-500" },
  valido:       { label: "Válido",       cls: "bg-emerald-100 text-emerald-700" },
  expirando:    { label: "Expirando",    cls: "bg-amber-100 text-amber-700" },
  expirado:     { label: "Expirado",     cls: "bg-rose-100 text-rose-700" },
};

export default function DocumentosList() {
  const nav = useNavigate();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  useEffect(() => {
    listDocumentos().then(setDocs).finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.tipoLabel.toLowerCase().includes(search.toLowerCase());
    const matchTipo = !filterTipo || d.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <AppLayout title="Documentos">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Documentos do condomínio</h2>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie os documentos legais e obrigatórios</p>
          </div>
          <button onClick={() => nav("/predio/documentos/novo")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            Novo documento
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar documento..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white">
            <option value="">Todos os tipos</option>
            {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText size={32} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-500">
                {docs.length === 0 ? "Nenhum documento cadastrado" : "Nenhum resultado encontrado"}
              </p>
              {docs.length === 0 && (
                <button onClick={() => nav("/predio/documentos/novo")}
                  className="mt-1 text-sm font-semibold text-indigo-600 hover:underline">
                  Adicionar primeiro documento
                </button>
              )}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Documento</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400 hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Validade</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const status = getDocumentoStatus(doc.dataValidade);
                  const sc = STATUS_CONFIG[status];
                  return (
                    <tr key={doc.id}
                      onClick={() => nav(`/predio/documentos/${doc.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                            <FileText size={16} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{doc.nome}</p>
                            {doc.arquivoNome && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{doc.arquivoNome}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                          {doc.tipoLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600">{formatDataValidade(doc.dataValidade)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ExternalLink size={15} className="text-gray-400 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
            <span key={key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${conf.cls}`}>
              {conf.label}
            </span>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
