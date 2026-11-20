import { formatCurrency } from "../utils/finance-calc";

type FinanceTooltipProps = {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
};

export function FinanceTooltip({ active, payload, label }: FinanceTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="mt-1">
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
}
