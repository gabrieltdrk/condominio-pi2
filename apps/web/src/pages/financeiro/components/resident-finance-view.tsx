import { CalendarClock, CheckCircle2, Copy, Download, FileBarChart2, FileText, Landmark, Receipt } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import AppLayout from "../../../features/layout/components/app-layout";
import type { FinanceBill } from "../../../features/financeiro/services/financeiro";
import type { AccountabilityReport } from "../utils/finance-calc";
import { formatCurrency, formatDate, formatMonthLongLabel, getMonthKey, getBillStatusMeta } from "../utils/finance-calc";
import { buildPixCode, openBillPrintView, openReceiptPrintView, openAccountabilityPrintView, openInvoicesPrintView } from "../utils/finance-print";

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur";

type ExpenseBreakdownItem = {
  category: string;
  value: number;
  label: string;
  color: string;
  tone: string;
  icon: React.ElementType;
};

type Props = {
  loading: boolean;
  error: string;
  actionMessage: string;
  nextResidentBill: FinanceBill | null;
  residentBills: FinanceBill[];
  reserveFundAmount: number;
  referenceMonthLabel: string;
  residentExpenseBreakdown: ExpenseBreakdownItem[];
  residentExpenseTotal: number;
  accountabilityReports: AccountabilityReport[];
  onSetActionMessage: (msg: string) => void;
};

export function ResidentFinanceView({
  loading, error, actionMessage,
  nextResidentBill, residentBills,
  reserveFundAmount, referenceMonthLabel,
  residentExpenseBreakdown, residentExpenseTotal,
  accountabilityReports,
  onSetActionMessage,
}: Props) {
  const nextBillStatus = nextResidentBill ? getBillStatusMeta(nextResidentBill.status) : null;

  return (
    <AppLayout title="Financeiro">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(248,250,252,0))]" />

        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
        {actionMessage && <p className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{actionMessage}</p>}
        {loading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Carregando financeiro...</p>}

        {!loading && !error && (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
              <div className={`${panelClass} overflow-hidden bg-[linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(67,56,202,0.92)_55%,_rgba(30,41,59,0.95))] text-white`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">
                      <Receipt size={13} />
                      Meu proximo vencimento
                    </div>
                    <h2 className="mt-4 text-[clamp(1.6rem,2.4vw,2.2rem)] font-black tracking-[-0.04em] text-white">
                      {nextResidentBill ? formatCurrency(nextResidentBill.amount) : "Sem cobrancas abertas"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-indigo-100/90">
                      {nextResidentBill
                        ? `Competencia ${formatDate(nextResidentBill.competence_date)} com vencimento em ${formatDate(nextResidentBill.due_date)}.`
                        : "Quando a proxima taxa condominial for emitida, ela aparecera aqui com atalhos rapidos."}
                    </p>
                    {nextResidentBill && (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${nextBillStatus?.className ?? "border-white/15 bg-white/10 text-white"}`}>
                          {nextBillStatus?.label}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-50">{nextResidentBill.unit}</span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-50">{nextResidentBill.bill_code}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!nextResidentBill}
                      onClick={async () => {
                        if (!nextResidentBill) return;
                        await navigator.clipboard.writeText(buildPixCode(nextResidentBill));
                        onSetActionMessage(`Codigo PIX de ${nextResidentBill.bill_code} copiado.`);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Copy size={16} />
                      Copiar Codigo PIX
                    </button>
                    <button
                      type="button"
                      disabled={!nextResidentBill}
                      onClick={() => nextResidentBill && openBillPrintView(nextResidentBill)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={16} />
                      Baixar Boleto PDF
                    </button>
                  </div>
                </div>

                {nextResidentBill && (
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">Codigo rapido</p>
                    <p className="mt-2 break-all font-mono text-sm text-white/90">{buildPixCode(nextResidentBill)}</p>
                  </div>
                )}
              </div>

              <aside className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8faff)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Fundo de Reserva / Obras</h3>
                    <p className="mt-1 text-sm text-slate-500">Saldo agregado reservado para manutencoes e contingencias.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">Transparencia condominial</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.04em]">{formatCurrency(reserveFundAmount)}</p>
                  <p className="mt-2 text-sm text-slate-300">Reserva consolidada para maresia, pintura e manutencoes preventivas.</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Maresia</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(reserveFundAmount * 0.58)}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Pintura</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(reserveFundAmount * 0.42)}</p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className={`${panelClass} bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,247,255,0.98))]`}>
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <FileBarChart2 size={20} />
                    </div>
                    <div>
                      <h3 className="m-0 text-base font-semibold text-slate-900">Para onde vai seu dinheiro</h3>
                      <p className="mt-1 text-sm text-slate-500">Distribuicao das despesas do condominio em {referenceMonthLabel}.</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Resumo agregado
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
                  <div className="h-[280px] rounded-[24px] border border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_34%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] p-4">
                    {residentExpenseBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={residentExpenseBreakdown} dataKey="value" nameKey="label" innerRadius={62} outerRadius={90} paddingAngle={3}>
                            {residentExpenseBreakdown.map((item) => (
                              <Cell key={item.category} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                        Nenhuma despesa consolidada disponivel para o periodo.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {residentExpenseBreakdown.map((item) => {
                      const Icon = item.icon;
                      const percentage = residentExpenseTotal > 0 ? Math.round((item.value / residentExpenseTotal) * 100) : 0;
                      return (
                        <div key={item.category} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                              <p className="text-xs text-slate-500">{percentage}% do total do mes</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        </div>
                      );
                    })}
                    {residentExpenseBreakdown.length === 0 && (
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        O grafico sera preenchido automaticamente quando houver lancamentos do mes.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Panorama pessoal</h3>
                    <p className="mt-1 text-sm text-slate-500">Resumo rapido das suas cobrancas e pagamentos.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Pagos</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">
                      {formatCurrency(residentBills.filter((b) => b.status === "PAID").reduce((s, b) => s + b.amount, 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Em aberto</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">
                      {formatCurrency(residentBills.filter((b) => b.status === "PENDING").reduce((s, b) => s + b.amount, 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Atrasado</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">
                      {formatCurrency(residentBills.filter((b) => b.status === "OVERDUE").reduce((s, b) => s + b.amount, 0))}
                    </p>
                  </div>
                </div>
              </aside>
            </section>

            <section className={`${panelClass} overflow-hidden bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)]`}>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Meus Pagamentos</h3>
                    <p className="mt-1 text-sm text-slate-500">Historico pessoal de boletos sem expor informacoes de outros moradores.</p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {residentBills.length} registros
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-3">Mes de referencia</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/90">
                    {residentBills.map((bill) => {
                      const statusMeta = getBillStatusMeta(bill.status);
                      return (
                        <tr key={bill.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">{formatMonthLongLabel(getMonthKey(bill.competence_date))}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatCurrency(bill.amount)}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatDate(bill.due_date)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              disabled={bill.status !== "PAID"}
                              onClick={() => openReceiptPrintView(bill)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Download size={15} />
                              Recibo
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {residentBills.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          Nenhum boleto pessoal encontrado para este usuario.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Prestacao de Contas</h3>
                <p className="mt-1 text-sm text-slate-500">Balancetes mensais e notas fiscais principais para consulta transparente do condominio.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {accountabilityReports.map((report) => (
                  <article key={report.key} className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)]`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Balancete mensal</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900">{report.label}</h4>
                      </div>
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                        {report.highlights.length} notas
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Receitas</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(report.receitas)}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Despesas</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(report.despesas)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Saldo</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(report.saldo)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openAccountabilityPrintView(report)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <FileText size={16} />
                        Baixar Balancete PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => openInvoicesPrintView(report)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Receipt size={16} />
                        Ver Notas Fiscais
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
