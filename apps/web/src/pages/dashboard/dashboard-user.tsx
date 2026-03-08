import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/app-layout";
import { listOcorrencias, type Ocorrencia, type OcorrenciaStatus } from "../../services/ocorrencias";

const STATUS_COLORS: Record<OcorrenciaStatus, string> = {
  Aberto: "bg-blue-50 text-blue-700 border-blue-200",
  "Em Análise": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em Atendimento": "bg-orange-50 text-orange-700 border-orange-200",
  "Pendente Terceiros": "bg-purple-50 text-purple-700 border-purple-200",
  Concluído: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

const card = "border border-gray-200 rounded-[14px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-4";
const btn = "px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-gray-900 cursor-pointer font-semibold text-sm";
const btnPrimary = `${btn} bg-gray-900 text-white border-gray-900`;

export default function DashboardUser() {
  const nav = useNavigate();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOcorrencias(3)
      .then(setOcorrencias)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const abertas = ocorrencias.filter((o) =>
    ["Aberto", "Em Análise", "Em Atendimento", "Pendente Terceiros"].includes(o.status)
  );

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <AppLayout title="Área do Morador">
      <div className="grid gap-4">

        {/* KPIs */}
        <section className="grid grid-cols-12 gap-4">
          <div className={`${card} col-span-12 sm:col-span-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Ocorrências abertas</h3>
                <p className="mt-1 text-xs text-gray-500">Aguardando resolução</p>
              </div>
              <AlertCircle size={18} className="text-gray-400 mt-0.5" />
            </div>
            <div className="mt-2.5 text-[28px] font-bold tracking-tight">{loading ? "—" : abertas.length}</div>
            <p className="mt-1 text-xs text-gray-500">{loading ? "" : `${ocorrencias.length} total registradas`}</p>
          </div>

          <div className={`${card} col-span-12 sm:col-span-6 flex flex-col justify-between`}>
            <div>
              <h3 className="m-0 text-sm font-semibold text-gray-900">Abrir nova ocorrência</h3>
              <p className="mt-1 text-xs text-gray-500">Reporte problemas ou faça sugestões</p>
            </div>
            <button
              className={`${btnPrimary} flex items-center gap-1.5 mt-3 w-fit`}
              onClick={() => nav("/ocorrencias")}
            >
              <Plus size={15} />
              Nova Ocorrência
            </button>
          </div>
        </section>

        {/* Últimas ocorrências */}
        <section className="grid grid-cols-12 gap-4">
          <div className={`${card} col-span-12`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Minhas ocorrências recentes</h3>
                <p className="mt-1 text-xs text-gray-500">Últimas 3 registradas</p>
              </div>
              <ClipboardList size={18} className="text-gray-400 mt-0.5" />
            </div>

            {loading && <p className="mt-3 text-xs text-gray-500">Carregando...</p>}

            {!loading && ocorrencias.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <p className="text-sm text-gray-500">Você ainda não tem ocorrências registradas.</p>
                <button className={btnPrimary} onClick={() => nav("/ocorrencias")}>
                  Abrir primeira ocorrência
                </button>
              </div>
            )}

            {!loading && ocorrencias.length > 0 && (
              <>
                <div className="grid gap-2.5 mt-3">
                  {ocorrencias.map((o) => (
                    <div key={o.id} className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200">
                      <div>
                        <strong className="text-[13px]">{o.assunto}</strong>
                        <small className="block mt-0.5 text-gray-500 text-xs">
                          {o.protocolo} · {o.categoria} · {fmt(o.created_at)}
                        </small>
                      </div>
                      <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[o.status]}`}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button className={btn} onClick={() => nav("/ocorrencias")}>Ver todas</button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
