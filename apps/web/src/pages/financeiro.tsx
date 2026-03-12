import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, CalendarClock, CircleDollarSign, Wallet } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";

const upcomingBills = [
  { title: "Conta de energia das áreas comuns", due: "14 mar", amount: "R$ 2.480", status: "Vence amanhã" },
  { title: "Contrato da portaria remota", due: "16 mar", amount: "R$ 6.900", status: "Em 4 dias" },
  { title: "Manutenção dos elevadores", due: "18 mar", amount: "R$ 1.950", status: "Em 6 dias" },
  { title: "Internet do condomínio", due: "20 mar", amount: "R$ 389", status: "Em 8 dias" },
];

const defaulters = [
  { resident: "Carlos Henrique", apartment: "Bloco A • Ap 203", delay: "18 dias", amount: "R$ 1.240" },
  { resident: "Fernanda Souza", apartment: "Bloco B • Ap 504", delay: "32 dias", amount: "R$ 2.480" },
  { resident: "Marcos Vinicius", apartment: "Bloco C • Ap 102", delay: "7 dias", amount: "R$ 620" },
];

const recentMovements = [
  { label: "Recebimento de taxas condominiais", type: "entry", amount: "+ R$ 18.760", when: "Hoje, 09:20" },
  { label: "Pagamento da equipe de limpeza", type: "exit", amount: "- R$ 3.200", when: "Hoje, 11:40" },
  { label: "Fundo de reserva aplicado", type: "entry", amount: "+ R$ 4.500", when: "Ontem, 16:15" },
  { label: "Compra de materiais hidráulicos", type: "exit", amount: "- R$ 890", when: "Ontem, 18:05" },
];

export default function FinanceiroPage() {
  return (
    <AppLayout title="Financeiro">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(167,243,208,0.35),_transparent_35%),linear-gradient(135deg,_#f0fdf4_0%,_#ffffff_52%,_#f8fafc_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Wallet size={13} />
                Visão financeira do condomínio
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Acompanhe caixa, receitas e inadimplência</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Painel para monitorar o fluxo financeiro do condomínio, identificar contas próximas do vencimento e agir rápido sobre moradores inadimplentes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[640px]">
              {[
                { icon: CircleDollarSign, label: "Saldo em caixa", value: "R$ 84.320", hint: "Atualizado hoje", tone: "bg-white border-emerald-100 text-emerald-700" },
                { icon: ArrowUpCircle, label: "Ganhos do mês", value: "R$ 42.780", hint: "+12% vs mês passado", tone: "bg-white border-slate-100 text-slate-700" },
                { icon: ArrowDownCircle, label: "Gastos do mês", value: "R$ 26.450", hint: "Dentro do previsto", tone: "bg-white border-slate-100 text-slate-700" },
                { icon: AlertTriangle, label: "Inadimplência", value: "R$ 4.340", hint: "3 unidades em atraso", tone: "bg-white border-amber-100 text-amber-700" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-slate-400">{card.hint}</span>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Contas a vencer</h3>
                <p className="mt-0.5 text-xs text-slate-400">Despesas que pedem atenção nos próximos dias.</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                4 lançamentos próximos
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {upcomingBills.map((bill) => (
                <div key={bill.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{bill.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Vencimento: {bill.due}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {bill.amount}
                      </span>
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {bill.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Moradores inadimplentes</h3>
                <p className="mt-0.5 text-xs text-slate-400">Unidades com parcelas em aberto e risco de acúmulo.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {defaulters.map((item) => (
                <div key={`${item.resident}-${item.apartment}`} className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{item.resident}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.apartment}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-rose-700">{item.delay}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-rose-700">{item.amount}</span>
                    <button className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100">
                      Cobrar agora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Banknote size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Resumo financeiro</h3>
                <p className="mt-0.5 text-xs text-slate-400">Indicadores rápidos do mês corrente.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Lucro operacional", value: "R$ 16.330", tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
                { label: "Taxas recebidas", value: "92%", tone: "text-slate-700 bg-slate-50 border-slate-100" },
                { label: "Reserva acumulada", value: "R$ 121.000", tone: "text-slate-700 bg-slate-50 border-slate-100" },
                { label: "Boletos em aberto", value: "7", tone: "text-amber-700 bg-amber-50 border-amber-100" },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl border p-4 ${item.tone}`}>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarClock size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Movimentações recentes</h3>
                <p className="mt-0.5 text-xs text-slate-400">Entradas e saídas para acompanhamento do caixa.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentMovements.map((movement) => {
                const isEntry = movement.type === "entry";
                return (
                  <div key={`${movement.label}-${movement.when}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isEntry ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {isEntry ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                      </div>
                      <div>
                        <p className="m-0 text-sm font-semibold text-slate-800">{movement.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{movement.when}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${isEntry ? "text-emerald-700" : "text-rose-700"}`}>
                      {movement.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
