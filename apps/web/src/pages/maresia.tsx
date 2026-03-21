import { AlertTriangle, CheckCircle2, ClipboardCheck, Droplets, Gauge, ShieldAlert, Waves, Wind } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";

const riskZones = [
  { area: "Fachada leste", risk: "Crítico", humidity: "87%", action: "Aplicar proteção anticorrosiva", tone: "bg-rose-50 border-rose-100 text-rose-700" },
  { area: "Guarda-corpos da cobertura", risk: "Alto", humidity: "79%", action: "Inspeção visual em 48h", tone: "bg-amber-50 border-amber-100 text-amber-700" },
  { area: "Casa de máquinas", risk: "Moderado", humidity: "68%", action: "Revisar pontos de oxidação", tone: "bg-indigo-50 border-indigo-100 text-indigo-700" },
  { area: "Portões externos", risk: "Controlado", humidity: "58%", action: "Manutenção mensal mantida", tone: "bg-emerald-50 border-emerald-100 text-emerald-700" },
];

const maintenancePlan = [
  { title: "Lavagem técnica das esquadrias", period: "Quinzenal", owner: "Equipe predial", status: "Em dia" },
  { title: "Inspeção de ferragens e dobradiças", period: "Semanal", owner: "Zeladoria", status: "Próxima em 2 dias" },
  { title: "Reaperto de guarda-corpos", period: "Mensal", owner: "Terceirizada", status: "Agendada para sexta" },
  { title: "Reaplicação de verniz marítimo", period: "Trimestral", owner: "Manutenção", status: "Vence em 12 dias" },
];

const alertFeed = [
  { time: "08:10", label: "Pico de salinidade previsto no fim da tarde", detail: "Ventania costeira acima do padrão histórico para o bloco A." },
  { time: "10:45", label: "Umidade elevada na fachada norte", detail: "Sensores registraram permanência acima de 80% por 3 horas." },
  { time: "12:30", label: "Checklist da cobertura pendente", detail: "Falta registrar inspeção visual dos pontos metálicos expostos." },
];

export default function MaresiaPage() {
  return (
    <AppLayout title="Maresia">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.28),_transparent_38%),linear-gradient(135deg,_#ecfeff_0%,_#ffffff_55%,_#f8fafc_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                <Waves size={13} />
                Monitoramento costeiro
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Plano preventivo contra maresia</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Painel operacional para acompanhar risco de corrosão, níveis de exposição e ações preventivas do condomínio em região litorânea.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              {[
                { icon: Gauge, label: "Índice de maresia", value: "78/100", hint: "Alto hoje", tone: "bg-white text-cyan-700 border-cyan-100" },
                { icon: Wind, label: "Vento costeiro", value: "28 km/h", hint: "Rajadas moderadas", tone: "bg-white text-slate-700 border-slate-100" },
                { icon: Droplets, label: "Umidade externa", value: "82%", hint: "Acima do ideal", tone: "bg-white text-slate-700 border-slate-100" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${item.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-slate-400">{item.hint}</span>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Áreas com maior exposição</h3>
                <p className="mt-0.5 text-xs text-slate-400">Priorize intervenção nas estruturas mais sensíveis à corrosão.</p>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                2 zonas críticas
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {riskZones.map((zone) => (
                <div key={zone.area} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{zone.area}</p>
                      <p className="mt-1 text-xs text-slate-500">Umidade atual: {zone.humidity}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${zone.tone}`}>
                        {zone.risk}
                      </span>
                      <span className="text-xs text-slate-500">{zone.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Alertas do dia</h3>
                <p className="mt-0.5 text-xs text-slate-400">Sinais que podem antecipar manutenção corretiva.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {alertFeed.map((alert) => (
                <div key={`${alert.time}-${alert.label}`} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
                      <div>
                        <p className="m-0 text-sm font-semibold text-slate-800">{alert.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{alert.detail}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-700">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Rotina preventiva recomendada</h3>
                <p className="mt-0.5 text-xs text-slate-400">Checklist sugerido para reduzir desgaste por maresia.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {maintenancePlan.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.period} • Responsável: {item.owner}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Plano desta semana</h3>
                <p className="mt-0.5 text-xs text-slate-400">Sugestão de execução para equipes internas.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Revisar ferragens expostas da cobertura",
                "Inspecionar pontos de infiltração próximos às esquadrias",
                "Validar estoque de protetivo anticorrosivo",
                "Registrar fotos comparativas da fachada leste",
              ].map((task, index) => (
                <div key={task} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="m-0 text-sm text-slate-700">{task}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
