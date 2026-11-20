import { X } from "lucide-react";
import type { ReactNode } from "react";

const modalShell = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6";
const modalPanel = "max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl";

type Props = {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function GarageModal({ title, icon, onClose, children }: Props) {
  return (
    <div className={modalShell} onClick={onClose}>
      <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</span>
            <h3 className="m-0 text-lg font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
