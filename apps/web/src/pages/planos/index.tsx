import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Users,
  UserCheck,
  Infinity as InfinityIcon,
  X,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { PLAN_DEFINITIONS, type PlanDefinition } from "../../config/plans";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EditablePlan = {
  id: string;
  label: string;
  maxResidents: number | null;
  maxAdmins: number | null;
  monthlyPrice: string;
  annualPrice: string;
  features: Record<string, boolean>;
};

const FEATURE_LABELS: Record<string, string> = {
  avisos: "Avisos",
  financeiro: "Financeiro",
  agendamentos: "Agendamentos",
  ocorrencias: "Ocorrências",
  relatoriosFinanceiros: "Relatórios Financeiros",
  suportePrioritario: "Suporte Prioritário",
  relatoriosAvancados: "Relatórios Avançados",
  suporteDedicado: "Suporte Dedicado",
};

function planToEditable(p: PlanDefinition): EditablePlan {
  return {
    id: p.id,
    label: p.label,
    maxResidents: p.maxResidents === Infinity ? null : p.maxResidents,
    maxAdmins: p.maxAdmins === Infinity ? null : p.maxAdmins,
    monthlyPrice: p.pricing.monthly !== null ? String(p.pricing.monthly / 100) : "",
    annualPrice: p.pricing.annualTotal !== null ? String(p.pricing.annualTotal / 100) : "",
    features: { ...p.features },
  };
}

const PLAN_COLORS: Record<string, { badge: string; ring: string; header: string }> = {
  go:    { badge: "bg-sky-100 text-sky-700",       ring: "ring-sky-200",    header: "from-sky-50 to-white" },
  plus:  { badge: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-200", header: "from-indigo-50 to-white" },
  ultra: { badge: "bg-violet-100 text-violet-700", ring: "ring-violet-200", header: "from-violet-50 to-white" },
};

// ─── Modal de edição do plano ─────────────────────────────────────────────────

function EditPlanModal({
  plan,
  onSave,
  onClose,
}: {
  plan: EditablePlan;
  onSave: (updated: EditablePlan) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditablePlan>(plan);

  const inputCls = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

  function toggleFeature(key: string) {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: !f.features[key] } }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Editar plano — {form.label}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5">
          <div>
            <label className={labelCls}>Nome do plano</label>
            <input className={inputCls} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Máx. moradores (vazio = ilimitado)</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                placeholder="Ilimitado"
                value={form.maxResidents ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, maxResidents: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div>
              <label className={labelCls}>Máx. síndicos (vazio = ilimitado)</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                placeholder="Ilimitado"
                value={form.maxAdmins ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, maxAdmins: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Preço mensal (R$)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                placeholder="Sob consulta"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Preço anual total (R$)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                placeholder="Sob consulta"
                value={form.annualPrice}
                onChange={(e) => setForm((f) => ({ ...f, annualPrice: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className={labelCls}>Funcionalidades incluídas</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => toggleFeature(key)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      form.features[key] ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"
                    }`}
                  >
                    {form.features[key] && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de plano ─────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: EditablePlan; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const colors = PLAN_COLORS[plan.id] ?? PLAN_COLORS.go;

  const monthlyDisplay = plan.monthlyPrice
    ? Number(plan.monthlyPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Sob consulta";
  const annualMonthly = plan.annualPrice ? (Number(plan.annualPrice) / 12).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
  const annualTotal = plan.annualPrice ? Number(plan.annualPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;

  const enabledFeatures = Object.entries(plan.features).filter(([, v]) => v);
  const disabledFeatures = Object.entries(plan.features).filter(([, v]) => !v);

  return (
    <div className={`rounded-3xl border bg-white shadow-sm ring-1 ${colors.ring} overflow-hidden`}>
      <div className={`bg-linear-to-b ${colors.header} px-6 py-5 border-b border-slate-100`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge} mb-2`}>
              {plan.id.toUpperCase()}
            </span>
            <h3 className="text-xl font-bold text-slate-900">{plan.label}</h3>
          </div>
          <button
            onClick={onEdit}
            className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
          >
            <Pencil size={15} />
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">{monthlyDisplay}</span>
            {plan.monthlyPrice && <span className="text-sm text-slate-500">/mês</span>}
          </div>
          {annualMonthly && annualTotal && (
            <p className="mt-1 text-xs text-slate-500">ou {annualMonthly}/mês no plano anual ({annualTotal}/ano)</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="flex flex-col items-center gap-1 px-4 py-3">
          <Users size={15} className="text-slate-400" />
          <p className="text-xs text-slate-500">Moradores</p>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-0.5">
            {plan.maxResidents === null ? <InfinityIcon size={16} /> : plan.maxResidents}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 px-4 py-3">
          <UserCheck size={15} className="text-slate-400" />
          <p className="text-xs text-slate-500">Síndicos</p>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-0.5">
            {plan.maxAdmins === null ? <InfinityIcon size={16} /> : plan.maxAdmins}
          </p>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-1.5">
          {enabledFeatures.map(([key]) => (
            <div key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <Check size={13} className="text-emerald-500 shrink-0" />
              {FEATURE_LABELS[key] ?? key}
            </div>
          ))}
          {expanded && disabledFeatures.map(([key]) => (
            <div key={key} className="flex items-center gap-2 text-sm text-slate-400">
              <X size={13} className="shrink-0" />
              {FEATURE_LABELS[key] ?? key}
            </div>
          ))}
        </div>
        {disabledFeatures.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Ocultar" : `+${disabledFeatures.length} não incluídos`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PlanosPage() {
  const [plans, setPlans] = useState<EditablePlan[]>(() =>
    Object.values(PLAN_DEFINITIONS).map(planToEditable),
  );
  const [editing, setEditing] = useState<EditablePlan | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSavePlan(updated: EditablePlan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <AppLayout title="Configuração de Planos">
      <div className="max-w-5xl mx-auto grid gap-6">

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Planos disponíveis</h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure limites e funcionalidades de cada plano.</p>
          </div>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">
              <Check size={15} /> Alterações salvas
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={() => setEditing(plan)} />
          ))}
        </div>
      </div>

      {editing && (
        <EditPlanModal plan={editing} onSave={handleSavePlan} onClose={() => setEditing(null)} />
      )}

    </AppLayout>
  );
}
